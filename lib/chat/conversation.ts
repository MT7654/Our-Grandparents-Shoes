import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']

export const createConversation = async (
    chatID: Conversation['cid'],
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .insert({
            cid: chatID
        })
        .select()
        .single()
    
    if (error) {
        console.error("Error creating conversation: ", error)
        throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return data as Conversation
}

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

export const getExistingConversationByCID = async (
    chatID: Conversation['cid'] 
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('cid', chatID)
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