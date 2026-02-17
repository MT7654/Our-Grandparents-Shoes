import { 
    createConversation, 
    saveConversation, 
    getConversationByConversationID, 
    getExistingConversationByScenario, 
    getUserConversations,
    checkForCompletion,
    reduceTurns
} from './conversation'
import { saveEvaluation, getEvaluation } from './evaluation'
import { saveMessage, getMessages } from './message'
import { saveScores, getScores } from './score'
import { evaluateCompletion } from '@/lib/llm/completion'
import { talkToPersona } from '../llm/chat'
import { evaluateResponse } from '../llm/evaluate'
import type { Database } from '@/supabase/types'
import { type EndConversationEvaluation, ScenarioKeys, PersonaKeys, Persona } from '@/lib/types/types'
import scenarios from '../scenarios.json'
import personas from '../personas.json'

type Conversation = Database['public']['Tables']['conversations']['Row']

const DEFAULT_MESSAGE = "Hello dear! It's so nice to have someone to talk to. How are you doing today?"
const DEFAULT_CHAT_ERROR_MESSAGE = "Sorry something went wrong. Please try again later."

export { getUserConversations, saveMessage, saveEvaluation }

export const startConversation = async (
    scenario_name: Conversation['scenario_name'],
    difficulty_level: Conversation['difficulty']
) => {    
    const scenario = scenarios[scenario_name as ScenarioKeys]
    const persona = personas[scenario.persona as PersonaKeys]
    const conversation = await getExistingConversationByScenario(scenario_name)

    if (!conversation) {
        const new_conversation = await createConversation(scenario_name, difficulty_level)
        const new_message = await saveMessage(new_conversation.vid, 'persona', DEFAULT_MESSAGE)

        return {
            scenario,
            persona,
            conversation: new_conversation,
            messages: new_message ? [new_message] : [],
            evaluation: null,
        } 
    } else {
        const full_conversation = await fetchFullConversation(conversation.vid)
        return {
            scenario,
            persona,
            ...full_conversation
        }
    }
}

export const endConversation = async (
    converseID: Conversation['vid']
) => {
    const { conversation, messages } = await fetchFullConversation(converseID)

    if (!conversation) {
        throw new Error(`No conversation found for conversation ID ${converseID}`)
    }

    if (!messages || messages.length === 0) {
        throw new Error(`No messages found for conversation ID "${converseID}"`)
    }

    const evaluation: EndConversationEvaluation = await evaluateCompletion(messages)

    const final_conversation = await saveConversation(converseID, conversation.completed ? conversation.completed : evaluation.completed, evaluation.feedback)
    const scores = await saveScores(converseID, evaluation.scores)

    if (!scores) {
        throw new Error(`Failed to save scores for conversation ID "${converseID}"`)
    }

    return {
        ...final_conversation,
        scores,
    }
}

export const fetchFullConversation = async (
    converseID: Conversation['vid']
) => {
    const [ conversation, evaluation, messages ] = await Promise.all([
        getConversationByConversationID(converseID),
        getEvaluation(converseID),
        getMessages(converseID)
    ])

    return {
        conversation,
        messages,
        evaluation,
    }
}

export const fetchCompleteConversation = async (
    converseID: Conversation['vid']
) => {
    const [ conversation, scores ] = await Promise.all([
        getConversationByConversationID(converseID),
        getScores(converseID)
    ])

    if (!conversation) {
        return null // Not found is a valid state, not an error
    }

    const scenario = scenarios[conversation.scenario_name as ScenarioKeys]

    if (!scores || scores.length === 0) {
        throw new Error(`No scores found for conversation ID "${converseID}"`)
    }

    const values = scores.map(s => s.metric_value)
    const total = values.reduce((acc, v) => (acc + v), 0 as number)
    const average = Math.floor(total / values.length)

    const formatted_scores = scores.reduce((acc, s) => {
        acc[s.metric_name] = s.metric_value
        return acc
    }, {} as Record<string, number>)


    return {
        ...conversation,
        scores: formatted_scores,
        average,
        objective: scenario.description
    }
}

export const converse = async (
    converseID: Conversation['vid'],
    latestMessage: string,
) => {
    // Check whether the conversation has ended
    const { turns } = await checkForCompletion(converseID)

    // Fetch Conversation, Existing Messages and Existing Evaluation
    const { conversation, messages, evaluation } = await fetchFullConversation(converseID)

    if (!conversation || !messages ) {
        return {
            user_message: null,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null,
            turns
        }
    }

    // Fetch Scenario
    const scenario = scenarios[conversation.scenario_name as ScenarioKeys]

    // Fetch Persona
    const persona: Persona = personas[scenario.persona as PersonaKeys]

    // Save User Message
    const user_message = await saveMessage(converseID, 'user', latestMessage)

    if (!user_message) {
        return {
            user_message: null,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null,
            turns,
        }
    }

    // LLM (Parallel) (lastest message sent separately)
    const [ reply, verdict ] = await Promise.all([
        talkToPersona(persona, messages, latestMessage),
        evaluateResponse(persona, latestMessage, messages, scenario.description)
    ])

    // Update Rapport (Clamped)
    const original_rapport = evaluation ? evaluation.rapport : 50
    const new_rapport = Math.min(100, Math.max(0, (original_rapport + verdict.rapportChange)))

    // Save Persona Reply and Evaluation
    const [ persona_reply, new_eval ] = await Promise.all([
        saveMessage(converseID, 'persona', reply),
        saveEvaluation(
            converseID, 
            verdict.sentiment, 
            verdict.expression, 
            new_rapport, 
            verdict.suggestion
        )
    ])

    if (!persona_reply || !new_eval) {
        return {
            user_message: user_message,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null,
            turns,
        }
    }

    // If all successful, reduce turns by one
    const { turns: newTurns } = await reduceTurns(converseID, turns)

    return {
        user_message: user_message,
        persona_message: persona_reply,
        evaluation: new_eval,
        rapport_change: verdict.rapportChange,
        turns: newTurns,
    }
}
