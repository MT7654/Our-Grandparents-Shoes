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
        console.error("Error fetching chats: ", error)
        return null
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
        console.error("Error fetching chats: ", error)
        return null
    }

    return data as Chat
}