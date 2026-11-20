import { createServiceClient } from '@/lib/neon/data'
import { visits, sceneFor, resolveChoice } from '../visits/scenes'
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
import { savePersonaMessage, getMessages, saveUserMessage, updateUserMessageFeedback, updatePersonaMessageContent } from './message'
import { saveScores, getScores } from './score'
import { evaluateCompletion } from '@/lib/llm/completion'
import { talkToPersona } from '../llm/chat'
import { evaluateResponse } from '../llm/evaluate'
import type { Database } from '@/supabase/types'
import { type EndConversationEvaluation, ScenarioKeys, PersonaKeys, Persona, Scenario } from '@/lib/types/types'
import scenarios from '../scenarios.json'
import personas from '../personas.json'

type Conversation = Database['public']['Tables']['conversations']['Row']

export { getUserConversations, saveUserMessage, savePersonaMessage, saveEvaluation }

/**
 * Resumes an existing in-progress conversation for a scenario.
 * Returns null if no active conversation exists for that scenario.
 */
export const resumeConversation = async (
    scenario_name: Conversation['scenario_name'], context = 'standalone'
) => {
    const scenario = scenarios[scenario_name as ScenarioKeys] as Scenario
    const persona = personas[scenario.persona as PersonaKeys] as Persona
    const conversation = await getExistingConversationByScenario(scenario_name, context)

    if (!conversation) {
        return null
    }

    const full_conversation = await fetchFullConversation(conversation.vid)
    return {
        scenario,
        persona,
        ...full_conversation
    }
}

/**
 * Starts or resumes a conversation: creates a new one with a random starting message and turn count,
 * or returns full state if an in-progress conversation already exists for the scenario.
 */
export const startConversation = async (
    scenario_name: Conversation['scenario_name'],
    difficulty_level: Conversation['difficulty'], context = 'standalone', callback?: string
) => {
    const scenario = scenarios[scenario_name as ScenarioKeys] as Scenario
    const persona = personas[scenario.persona as PersonaKeys]
    const conversation = await getExistingConversationByScenario(scenario_name, context)
    const variants = visits.filter(visit => visit.scenario === scenario_name)
    const first_message = variants[Math.floor(Math.random() * variants.length)].opening

    const max_turns = scenarios[scenario_name as ScenarioKeys].constraints.max_turns
    const min_turns = scenarios[scenario_name as ScenarioKeys].constraints.min_turns
    const turns = min_turns === max_turns ? min_turns : Math.floor(Math.random() * (max_turns - min_turns + 1)) + min_turns

    if (!conversation) {
        const new_conversation = await createConversation(scenario_name, difficulty_level, turns, context)
        const new_message = await savePersonaMessage(new_conversation.vid, callback ? first_message + '\n' + callback : first_message)

        return {
            scenario,
            persona,
            conversation: new_conversation,
            messages: new_message ? [new_message] : [],
            evaluation: null
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

/**
 * Ends a conversation: runs completion evaluation, saves feedback and scores, and returns the saved result.
 */
export const endConversation = async (
    converseID: Conversation['vid'],
    end_early: boolean
) => {
    const { conversation, messages } = await fetchFullConversation(converseID)

    if (!conversation) {
        throw new Error(`No conversation found for conversation ID ${converseID}`)
    }

    if (!messages || messages.length === 0) {
        throw new Error(`No messages found for conversation ID "${converseID}"`)
    }

    const scene = sceneFor(conversation.scenario_name, messages)
    const saved = await getScores(converseID)
    if (conversation.completed && saved.length) return { ...conversation, scores:saved }
    let evaluation: EndConversationEvaluation
    try { evaluation = await evaluateCompletion(messages, scenarios[conversation.scenario_name as ScenarioKeys].objective) } catch(error) {
        if (!scene) throw error
        const saved = await saveConversation(converseID, scene.ended || end_early, 'Assessment unavailable')
        return {...saved, scores:[]}
    }

    // Update completion base on end_early or completed
    conversation.completed = conversation.completed || end_early ? true : evaluation.completed
    
    const final_conversation = await saveConversation(converseID, conversation.completed, evaluation.feedback)
    const scores = evaluation.scores.length ? await saveScores(converseID, evaluation.scores) : []

    if (!scores) {
        throw new Error(`Failed to save scores for conversation ID "${converseID}"`)
    }

    return {
        ...final_conversation,
        scores,
    }
}

/**
 * Fetches conversation record, messages, and current evaluation for a conversation (parallel).
 */
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

/**
 * Fetches a completed conversation with its scores and scenario objective for the results/complete page.
 */
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

    if (!scores?.length) return {...conversation, scores:{}, average:null, objective:scenario.objective}

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

/**
 * Handles one user message: saves it, gets persona reply and mid-conversation evaluation,
 * updates rapport and completion/turns, and returns the new messages and state.
 */
export const converse = async (
    converseID: Conversation['vid'],
    latestMessage: string,
    clientMessages?: Database['public']['Tables']['messages']['Row'][]
) => {
    // Check whether the conversation has already ended
    const { completed, turns } = await checkForCompletion(converseID)

    // Use client-provided messages if available, otherwise fetch from DB
    let conversation, messages, evaluation
    if (clientMessages && clientMessages.length > 0) {
        const [conv, eval_] = await Promise.all([
            getConversationByConversationID(converseID),
            getEvaluation(converseID)
        ])
        conversation = conv
        messages = clientMessages
        evaluation = eval_
    } else {
        const full = await fetchFullConversation(converseID)
        conversation = full.conversation
        messages = full.messages
        evaluation = full.evaluation
    }

    if (!conversation || !messages) {
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

    // LLM: persona reply and evaluation in parallel (latest message sent separately)
    const [ reply, verdict ] = await Promise.all([
        talkToPersona(conversation.scenario_name, conversation.difficulty, persona, messages, latestMessage),
        evaluateResponse(conversation.scenario_name, persona, latestMessage, messages, evaluation, conversation.difficulty, scenario.objective)
    ])

    // Save User Message + Feedback
    const user_message = await saveUserMessage(converseID, latestMessage, verdict.feedback, verdict.status)

    if (!user_message) {
        throw new Error('Failed to save user message')
    }

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

    // Save persona reply and evaluation
    const [persona_reply, new_eval] = await Promise.all([
        savePersonaMessage(converseID, (custom_reply !== '' ? custom_reply : reply)),
        saveEvaluation(
            converseID, 
            verdict.sentiment, 
            verdict.expression, 
            new_rapport, 
            verdict.suggestion
        )
    ])

    if (!persona_reply || !new_eval) {
        throw new Error('Unable to save persona and evaluation results')
    }

    // Update completion status based on score or task completion
    let updated_completion = false
    if (verdict.taskCompleted) {
        const { completed: new_update } = await updateCompletion(converseID, true, true)
        updated_completion = new_update
    } else if (new_rapport > scenario.constraints.score_upper_limit) {
        const { completed: new_update } = await updateCompletion(converseID, true, true)
        updated_completion = new_update
    } else if (new_rapport < scenario.constraints.score_bottom_limit) {
        const { completed: new_update } = await updateCompletion(converseID, true, false)
        updated_completion = new_update
    }

    if (updated_completion) {
        // For task-based scenarios, replace the reply entirely so the persona
        // doesn't ask follow-up questions after the task is done.
        if (verdict.taskCompleted) {
            persona_reply.content = scenario.score_end_message
        } else {
            persona_reply.content = persona_reply.content + ' ' + scenario.score_end_message
        }
    }

    // If all successful, reduce turns by one
    const { turns: newTurns } = await reduceTurns(converseID, turns, updated_completion)

    if (newTurns === 0) {
        persona_reply.content = persona_reply.content + ' ' + scenario.turn_end_message
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

/**
 * Phase 1: Gets the persona reply quickly. Saves user message (without feedback)
 * and persona message, returns immediately without waiting for evaluation.
 */
export const converseReply = async (
    converseID: Conversation['vid'],
    latestMessage: string,
    turnId: string, ownerId: string
) => {
    const { completed, turns } = await checkForCompletion(converseID)

    const { conversation, messages } = await fetchFullConversation(converseID)

    if (!conversation || !messages) {
        throw new Error('Failed to fetch conversation or messages')
    }

    const scenario = scenarios[conversation.scenario_name as ScenarioKeys]
    const persona: Persona = personas[scenario.persona as PersonaKeys]

    const character_limit = scenario.constraints.character_limit
    if (latestMessage.length > character_limit) {
        throw new Error('Message exceed character limit')
    }

    // If conversation was already completed before this turn, use custom reply
    const scene = sceneFor(conversation.scenario_name, messages)
    const existing = messages.some(m=>m.mid===turnId && m.sender==='user')
    if (!existing && (scene?.ended || completed)) throw new Error('This visit has ended')
    const action = resolveChoice(scene?.choices ?? [], latestMessage)
    let custom_reply = action?.reply ?? ''
    if (completed && turns <= 0) {
        custom_reply = scenario.turn_end_message
    } else if (completed) {
        custom_reply = scenario.score_end_message
    }

    // Get persona reply (skip LLM call if we already have a custom reply)
    const reply = existing ? '' : custom_reply !== ''
        ? custom_reply
        : await talkToPersona(conversation.scenario_name, conversation.difficulty, persona, messages, latestMessage)

    if (scene) {
        const db = await createServiceClient()
        const { data, error } = await db.rpc('commit_visit_turn', {owner_id: ownerId,visit_id: converseID,turn_id: turnId,previous_id: messages.at(-1)?.mid,volunteer_text: latestMessage,reply_text: reply,action_text: action?.label ?? null,event_name: action ? scene.visit.choices.includes(action) ? 'resolution' : 'turning_point' : null,ending: !!action && scene.visit.choices.includes(action)})
        if (error) throw Error(error.message)
        return data
    }

    // Save user message without feedback, and persona message
    const [user_message, persona_reply] = await Promise.all([
        saveUserMessage(converseID, latestMessage, null, null),
        savePersonaMessage(converseID, reply)
    ])

    if (!user_message || !persona_reply) {
        throw new Error('Failed to save messages')
    }

    return {
        user_message,
        persona_message: persona_reply,
        turns,
        completed,
        pendingEvaluation: true,
    }
}

/**
 * Phase 2: Runs evaluation, updates user message feedback, saves evaluation,
 * handles completion logic and turn reduction. Called after converseReply.
 */
export const converseEvaluate = async (
    converseID: Conversation['vid'],
    userMessageId: string,
    personaMessageId: string
) => {
    const [conversation, evaluation, messages] = await Promise.all([
        getConversationByConversationID(converseID),
        getEvaluation(converseID),
        getMessages(converseID)
    ])

    if (!conversation || !messages) {
        throw new Error('Failed to fetch conversation or messages')
    }

    const scenario = scenarios[conversation.scenario_name as ScenarioKeys]
    const persona: Persona = personas[scenario.persona as PersonaKeys]

    // Find the latest user message content from the saved messages
    const userMsg = messages.find(m => m.mid === userMessageId)
    if (!userMsg || userMsg.sender !== 'user' || !messages.some(m=>m.mid===personaMessageId && m.sender==='persona')) {
        throw new Error('User message not found')
    }

    // Exclude the latest user and persona messages from history for evaluation
    const history = messages.slice(0, messages.findIndex(m => m.mid === userMessageId))

    const verdict = await evaluateResponse(
        conversation.scenario_name,
        persona,
        userMsg.content,
        history,
        evaluation,
        conversation.difficulty,
        scenario.objective
    )

    if (sceneFor(conversation.scenario_name, messages)) {
        const db = await createServiceClient()
        const {data,error} = await db.rpc('assess_visit_turn',{visit_id:converseID,turn_id:userMessageId,reply_id_arg:personaMessageId,verdict,starting:scenario.constraints.starting_score})
        if(error)throw Error(error.message)
        return data
    }
    // Update user message with feedback
    await updateUserMessageFeedback(userMessageId, verdict.feedback, verdict.status)

    // Calculate new rapport
    const original_rapport = evaluation ? evaluation.rapport : scenario.constraints.starting_score
    const new_rapport = Math.min(100, Math.max(0, (original_rapport + verdict.rapportChange)))

    // Save evaluation
    const new_eval = await saveEvaluation(
        converseID,
        verdict.sentiment,
        verdict.expression,
        new_rapport,
        verdict.suggestion
    )

    if (!new_eval) {
        throw new Error('Unable to save evaluation results')
    }

    // Check completion based on score or task
    const { completed, turns } = await checkForCompletion(converseID)
    let updated_completion = false

    const scene = sceneFor(conversation.scenario_name, messages)
    if (scene ? scene.ended : verdict.taskCompleted) {
        const { completed: c } = await updateCompletion(converseID, true, true)
        updated_completion = c
    } else if (!scene && new_rapport > scenario.constraints.score_upper_limit) {
        const { completed: c } = await updateCompletion(converseID, true, true)
        updated_completion = c
    } else if (!scene && new_rapport < scenario.constraints.score_bottom_limit) {
        const { completed: c } = await updateCompletion(converseID, true, false)
        updated_completion = c
    }

    // Handle completion content override on persona message
    let completionOverride: string | null = null
    if (updated_completion && !scene) {
        if (verdict.taskCompleted) {
            completionOverride = scenario.score_end_message
        } else {
            const personaMsg = messages.find(m => m.mid === personaMessageId)
            completionOverride = (personaMsg?.content ?? '') + ' ' + scenario.score_end_message
        }
    }

    // Reduce turns
    const { turns: newTurns } = await reduceTurns(converseID, turns, updated_completion)

    if (newTurns === 0) {
        const personaMsg = messages.find(m => m.mid === personaMessageId)
        const base = completionOverride ?? personaMsg?.content ?? ''
        completionOverride = base + ' ' + scenario.turn_end_message
    }

    // Update persona message in DB if content changed
    if (completionOverride) {
        await updatePersonaMessageContent(personaMessageId, completionOverride)
    }

    return {
        evaluation: new_eval,
        rapport_change: verdict.rapportChange,
        turns: newTurns,
        completed: completed || updated_completion,
        completionOverride,
    }
}
