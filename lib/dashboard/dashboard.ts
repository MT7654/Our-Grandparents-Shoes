import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type PastSession = Database['public']['Views']['conversation_sessions']['Row']
type Statistic = Database['public']['Views']['statistics']['Row']

export const getPastConversations = async (
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversation_sessions')
        .select('*')
        .order('created_at')

    if (error) {
        console.error("Error fetching past conversations: ", error)
        return null
    }

    return data as PastSession[]
}

export const getOverallStatistics = async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('statistics') 
        .select('*')
        .single()

    if (error) {
        console.error("Error fetching user statistics: ", error)
        return null
    }

    return data as Statistic
}