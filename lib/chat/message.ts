import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type Message = Database['public']['Tables']['messages']['Row']

export const saveMessage = async (
    converseID: Message['vid'],
    sender: Message['sender'],
    content: Message['content']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .insert({
            vid: converseID,
            sender,
            content
        })
        .select()
        .single()
    
    if (error) {
        console.error("Error saving message: ", error)
        throw new Error(`Failed to save message: ${error.message}`)
    }

    return data as Message
}

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
