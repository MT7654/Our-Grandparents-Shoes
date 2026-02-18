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
