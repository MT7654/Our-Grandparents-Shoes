import { 
    createConversation, 
    saveConversation, 
    getConversationByConversationID, 
    getExistingConversationByScenario, 
    getUserConversations,
    checkForCompletion,
    updateCompletion,
    reduceTurns
} from './conversation'
import { saveEvaluation, getEvaluation } from './evaluation'
import { saveMessage, getMessages } from './message'
import { saveScores, getScores } from './score'
import { evaluateCompletion } from '@/lib/llm/completion'
import { talkToPersona } from '../llm/chat'
import { evaluateResponse } from '../llm/evaluate'
import type { Database } from '@/supabase/types'
import { type EndConversationEvaluation, ScenarioKeys, PersonaKeys, Persona, Scenario } from '@/lib/types/types'
import scenarios from '../scenarios.json'
import personas from '../personas.json'

type Conversation = Database['public']['Tables']['conversations']['Row']

export { getUserConversations, saveMessage, saveEvaluation }

export const startConversation = async (
    scenario_name: Conversation['scenario_name'],
    difficulty_level: Conversation['difficulty']
) => {    
    const scenario = scenarios[scenario_name as ScenarioKeys] as Scenario
    const persona = personas[scenario.persona as PersonaKeys]
    const conversation = await getExistingConversationByScenario(scenario_name)
    const first_message = scenario.starting_messages[Math.floor(Math.random() * scenario.starting_messages.length)]

       
    const max_turns = scenarios[scenario_name as ScenarioKeys].constraints.max_turns
    const min_turns = scenarios[scenario_name as ScenarioKeys].constraints.min_turns
    const turns = min_turns === max_turns ? min_turns : Math.floor(Math.random() * (max_turns - min_turns + 1)) + min_turns;

    if (!conversation) {
        const new_conversation = await createConversation(scenario_name, difficulty_level, turns)
        const new_message = await saveMessage(new_conversation.vid, 'persona', first_message)

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
        objective: scenario.objective
    }
}

export const converse = async (
    converseID: Conversation['vid'],
    latestMessage: string,
) => {
    // Check whether the conversation has ended
    const { completed, turns } = await checkForCompletion(converseID)

    // Fetch Conversation, Existing Messages and Existing Evaluation
    const { conversation, messages, evaluation } = await fetchFullConversation(converseID)

    if (!conversation || !messages ) {
        throw new Error('Failed to fetch conversation or messages')
    }

    // Fetch Scenario
    const scenario = scenarios[conversation.scenario_name as ScenarioKeys]

    // Fetch Persona
    const persona: Persona = personas[scenario.persona as PersonaKeys]

    // Check character limit
    const character_limit = scenario.constraints.character_limit

    if (latestMessage.length > character_limit) {
        throw new Error('Message exceed character limit')
    }

    // Save User Message
    const user_message = await saveMessage(converseID, 'user', latestMessage)

    if (!user_message) {
        throw new Error('Failed to save user message')
    }

    // LLM (Parallel) (lastest message sent separately)
    const [ reply, verdict ] = await Promise.all([
        talkToPersona(conversation.scenario_name, conversation.difficulty, persona, messages, latestMessage),
        evaluateResponse(conversation.scenario_name, persona, latestMessage, messages, evaluation, conversation.difficulty, scenario.objective)
    ])

    // Update Rapport (Clamped)
    const original_rapport = evaluation ? evaluation.rapport : scenario.constraints.starting_score
    const new_rapport = Math.min(100, Math.max(0, (original_rapport + verdict.rapportChange)))

    // Check completion
    let custom_reply = ""
    if (completed && turns <= 0) {
        custom_reply = scenario.turn_end_message
    } else if (completed) {
        custom_reply = scenario.score_end_message
    }

    // Save Persona Reply and Evaluation
    const [ persona_reply, new_eval ] = await Promise.all([
        saveMessage(converseID, 'persona', (custom_reply !== "" ? custom_reply : reply)),
        saveEvaluation(
            converseID, 
            verdict.sentiment, 
            verdict.expression, 
            new_rapport, 
            verdict.suggestion
        )
    ])

    if (!persona_reply || !new_eval) {
        throw new Error("Unable to save persona and evaluation results")
    }

    // Update completion status based on score
    let updated_completion = false
    if (new_rapport < scenario.constraints.score_bottom_limit || new_rapport > scenario.constraints.score_upper_limit) {
        const { completed: new_update } = await updateCompletion(converseID, true)
        updated_completion = new_update
    }

    if (updated_completion) {
        persona_reply.content = persona_reply.content + " " + scenario.score_end_message
    }

    // If all successful, reduce turns by one
    const { turns: newTurns } = await reduceTurns(converseID, turns, updated_completion)

    if (newTurns === 0) {
        persona_reply.content = persona_reply.content + " " + scenario.turn_end_message
    }

    return {
        user_message: user_message,
        persona_message: persona_reply,
        evaluation: new_eval,
        rapport_change: verdict.rapportChange,
        turns: newTurns,
        completed: completed || updated_completion
    }
}
