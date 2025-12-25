import { 
    createConversation, 
    saveConversation, 
    getConversationByConversationID, 
    getExistingConversationByCID, 
    getUserConversations 
} from './conversation'
import { getChatByPersonaID, getChatByChatID } from './chat'
import { saveEvaluation, getEvaluation } from './evaluation'
import { saveMessage, getMessages } from './message'
import { saveScores, getScores } from './score'
import { fetchPersona } from '../personas/personas'
import { evaluateCompletion } from '@/lib/llm/completion'
import { talkToPersona } from '../llm/chat'
import { evaluateResponse } from '../llm/evaluate'
import type { Database } from '@/supabase/types'
import { type EndConversationEvaluation } from '@/lib/types/types'

type Persona = Database['public']['Tables']['personas']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

const DEFAULT_MESSAGE = "Hello dear! It's so nice to have someone to talk to. How are you doing today?"

export { getUserConversations, saveMessage, saveEvaluation }

export const startConversation = async (
    personaID: Persona['pid']
) => {
    const chat = await getChatByPersonaID(personaID)

    if (!chat) {
        throw new Error(`No chat found for persona ID "${personaID}"`)
    }
    
    const conversation = await getExistingConversationByCID(chat.cid)

    if (!conversation) {
        const new_conversation = await createConversation(chat.cid)
        const new_message = await saveMessage(new_conversation.vid, 'persona', DEFAULT_MESSAGE)

        return {
            chat,
            conversation: new_conversation,
            messages: new_message ? [new_message] : [],
            evaluation: null,
        } 
    } else {
        const full_conversation = await fetchFullConversation(conversation.vid)
        return {
            chat,
            ...full_conversation
        }
    }
}

export const endConversation = async (
    converseID: Conversation['vid']
) => {
    const { messages } = await fetchFullConversation(converseID)

    if (!messages || messages.length === 0) {
        throw new Error(`No messages found for conversation ID "${converseID}"`)
    }

    const evaluation: EndConversationEvaluation = await evaluateCompletion(messages)

    const conversation = await saveConversation(converseID, evaluation.completed, evaluation.feedback)
    const scores = await saveScores(converseID, evaluation.scores)

    if (!scores) {
        throw new Error(`Failed to save scores for conversation ID "${converseID}"`)
    }

    return {
        ...conversation,
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

    if (!scores || scores.length === 0) {
        throw new Error(`No scores found for conversation ID "${converseID}"`)
    }

    const chat = await getChatByChatID(conversation.cid)

    if (!chat) {
        throw new Error(`Chat not found for conversation ID "${converseID}"`)
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
        objective: chat.objective
    }
}

const DEFAULT_CHAT_ERROR_MESSAGE = "Sorry something went wrong. Please try again later."

export const converse = async (
    converseID: Conversation['vid'],
    latestMessage: string,
) => {
    // Fetch Conversation, Existing Messages and Existing Evaluation
    const { conversation, messages, evaluation } = await fetchFullConversation(converseID)

    if (!conversation || !messages ) {
        return {
            user_message: null,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null
        }
    }

    // Fetch Chat and Persona
    const chat = await getChatByChatID(conversation.cid)

    if (!chat) {
        return {
            user_message: null,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null
        }
    }

    // Fetch Persona by Persona ID
    const persona = await fetchPersona(chat.pid)

    if (!persona) {
        return {
            user_message: null,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null
        }
    }

    // Save User Message
    const user_message = await saveMessage(converseID, 'user', latestMessage)

    if (!user_message) {
        return {
            user_message: null,
            persona_message: DEFAULT_CHAT_ERROR_MESSAGE,
            evaluation: null,
            rapport_change: null
        }
    }

    // LLM (Parallel) (lastest message sent separately)
    const [ reply, verdict ] = await Promise.all([
        talkToPersona(persona, messages, latestMessage),
        evaluateResponse(persona, latestMessage, messages, chat.objective)
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
            rapport_change: null
        }
    }

    return {
        user_message: user_message,
        persona_message: persona_reply,
        evaluation: new_eval,
        rapport_change: verdict.rapportChange
    }
}
