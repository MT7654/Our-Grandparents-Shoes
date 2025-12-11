import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type Chat = Database['public']['Tables']['chats']['Row']

export const getChatByPersonaID = async (
    personaID: Chat['pid']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('pid', personaID)
        .single()
    
    if (error) {
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
            return null
        }
        console.error("Error fetching chat: ", error)
        throw new Error(`Failed to fetch chat: ${error.message}`)
    }

    return data as Chat
}

export const getChatByChatID = async (
    chatID: Chat['cid']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('cid', chatID)
        .single()

    if (error) {
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
            return null
        }
        console.error("Error fetching chat: ", error)
        throw new Error(`Failed to fetch chat: ${error.message}`)
    }

    return data as Chat
}