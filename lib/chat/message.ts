import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type Message = Database['public']['Tables']['messages']['Row']

/**
 * Saves a single user message to a conversation.
 */
export const saveUserMessage = async (
    converseID: Message['vid'],
    content: Message['content'],
    feedback: Message['feedback'],
    status: Message['status']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .insert({
            vid: converseID,
            sender: 'user',
            content,
            feedback,
            status,
        })
        .select()
        .single()
    
    if (error) {
        console.error("Error saving user message: ", error)
        throw new Error(`Failed to save user message: ${error.message}`)
    }

    return data as Message
}

/**
 * Saves a single persona message to a conversation.
 */
export const savePersonaMessage = async (
    converseID: Message['vid'],
    content: Message['content']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .insert({
            vid: converseID,
            sender: 'persona',
            content
        })
        .select()
        .single()
    
    if (error) {
        console.error("Error saving persona message: ", error)
        throw new Error(`Failed to save persona message: ${error.message}`)
    }

    return data as Message
}

/**
 * Updates feedback and status on an existing user message.
 */
export const updateUserMessageFeedback = async (
    messageID: Message['mid'],
    feedback: Message['feedback'],
    status: Message['status']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .update({ feedback, status })
        .eq('mid', messageID)
        .select()
        .single()

    if (error) {
        console.error("Error updating user message feedback: ", error)
        throw new Error(`Failed to update user message feedback: ${error.message}`)
    }

    return data as Message
}

/**
 * Updates content on an existing persona message (e.g. completion override).
 */
export const updatePersonaMessageContent = async (
    messageID: Message['mid'],
    content: Message['content']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .update({ content })
        .eq('mid', messageID)
        .select()
        .single()

    if (error) {
        console.error("Error updating persona message content: ", error)
        throw new Error(`Failed to update persona message content: ${error.message}`)
    }

    return data as Message
}

/**
 * Fetches all messages for a conversation, ordered by sent_at.
 */
export const getMessages = async (
    converseID: Message['vid']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase 
        .from('messages')
        .select('*')
        .eq('vid', converseID)
        .order('sent_at')
    
    if (error) {
        console.error("Error fetching messages: ", error)
        throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    return (data || []) as Message[]
}
