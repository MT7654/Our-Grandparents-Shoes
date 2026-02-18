import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * Creates a new conversation record for a scenario with the given difficulty and turn count.
 */
export const createConversation = async (
    scenario: Conversation['scenario_name'],
    difficulty_level: Conversation['difficulty'],
    number_of_turns: number,
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .insert({
            scenario_name: scenario,
            turns: number_of_turns,
            difficulty: difficulty_level
        })
        .select()
        .single()

    if (error) {
        // 23505 = unique constraint violation (race condition, e.g. React Strict Mode double-mount)
        // Fall back to fetching the existing active conversation
        if (error.code === '23505') {
            const existing = await getExistingConversationByCID(chatID)
            if (existing) return existing
        }
        console.error("Error creating conversation: ", error)
        throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return data as Conversation
}

/**
 * Fetches the current turns remaining and completion status for a conversation.
 * @throws Error if conversation is not found or fetch fails
 */
export const checkForCompletion = async (
    converseID: Conversation['vid']
) => {
    const supabase = await createClient()

    // Read the number of turns remaining and whether the conversation has ended
    const { data, error } = await supabase
        .from('conversations')
        .select('turns, completed')
        .eq('vid', converseID)
        .single()
    
    // Check for errors or null data
    if (error) {
        console.error('Error fetching conversation details: ', error)
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
            throw new Error(`Conversation with ID "${converseID}" not found`)
        }
        throw new Error(`Failed to fetch conversation details: ${error.message}`)
    }

    if (!data) {
        console.error('Error fetching conversation details: No conversation found for conversation ID "${converseID}"')
        throw new Error(`No conversation found for conversation ID "${converseID}"`)
    }

    return {
        completed: data['completed'],
        turns: data['turns']
    }
}

/**
 * Decrements the conversation turn count and optionally marks as completed.
 */
export const reduceTurns = async (
    converseID: Conversation['vid'],
    currentTurns: number,
    score_completion: boolean
) => {
    const supabase = await createClient()

    const turns: number = currentTurns - 1

    const { data: updateData, error: updateError } = await supabase
        .from('conversations')
        .update({
            turns: turns,
            completed: turns <= 0 || score_completion
        })
        .eq('vid', converseID)
        .select()
        .single()

    if (updateError) {
        console.error('Error reduce conversation turns: ', updateError)
        // PGRST116 means no rows found
        if (updateError.code === 'PGRST116') {
            throw new Error(`Conversation with ID "${converseID}" not found`)
        }
        throw new Error(`Failed to reduce conversation turns: ${updateError.message}`)
    }

    return { 
        turns: updateData['turns'],
        completed: updateData['completed']
    }
}

/**
 * Updates the completed flag for a conversation.
 */
export const updateCompletion = async (
    converseID: Conversation['vid'],
    completion_status: Conversation['completed']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .update({
            completed: completion_status
        })
        .eq('vid', converseID)
        .select()
        .single()

    if (error) {
        console.error('Error updating conversation completion status: ', error)
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
            throw new Error(`Conversation with ID "${converseID}" not found`)
        }
        throw new Error(`Failed to update conversation status: ${error.message}`)
    }

    return {
        completed: data['completed'] as boolean
    }
}

/**
 * Persists conversation completion status and feedback (e.g. after end-conversation evaluation).
 */
export const saveConversation = async (
    converseID: Conversation['vid'],
    completed: Conversation['completed'],
    feedback: Conversation['feedback']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .update({
            completed,
            feedback,
        })
        .eq('vid', converseID)
        .select()
        .single()
    
    if (error) {
        console.error('Error saving conversation: ', error)
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
            throw new Error(`Conversation with ID "${converseID}" not found`)
        }
        throw new Error(`Failed to save conversation: ${error.message}`)
    }

    return data as Conversation
}

/**
 * Gets the current user's in-progress conversation for a scenario, if any.
 * Returns null when no active conversation exists (PGRST116).
 */
export const getExistingConversationByScenario = async (
    scenario: Conversation['scenario_name']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('scenario_name', scenario)
        .eq('completed', false)
        .single()
    
    if (error) {
        // PGRST116 means no rows found - this is expected, not an error
        if (error.code === 'PGRST116') {
            return null
        }
        console.error('Error fetching conversation: ', error)
        throw new Error(`Failed to fetch conversation: ${error.message}`)
    }

    return data as Conversation
}

/**
 * Fetches a single conversation by its vid. Returns null if not found.
 */
export const getConversationByConversationID = async (
    converseID: Conversation['vid']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('vid', converseID)
        .single()
    
    if (error) {
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
            return null
        }
        console.error('Error fetching conversation: ', error)
        throw new Error(`Failed to fetch conversation: ${error.message}`)
    }

    return data as Conversation
}

/**
 * Returns all conversations for the currently authenticated user.
 */
export const getUserConversations = async () => {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('uid', user.id)
    
    if (error) {
        console.error('Error fetching conversations: ', error)
        throw new Error(`Failed to fetch user conversations: ${error.message}`)
    }

    return (data || []) as Conversation[]
}