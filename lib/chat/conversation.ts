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
        return null
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
        console.error('Error ending conversation: ', error)
        return null
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
        console.error('Error fetching conversation: ', error)
        return null
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
        console.error('Error fetching conversation: ', error)
        return null
    }

    return data as Conversation
}

export const getUserConversations = async () => {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('No logged-in user')
        return null
    }

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('uid', user.id)
    
    if (error) {
        console.error('Error fetching conversations: ', error)
        return null
    }

    return data as Conversation[]
}