import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'
import type { DisplayBadge } from '@/lib/types/types'

type PastSession = Database['public']['Views']['conversation_sessions']['Row']
type Statistic = Database['public']['Views']['statistics']['Row']

export const getPastConversations = async (
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('conversation_sessions')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching past conversations: ", error)
        throw new Error(`Failed to fetch past conversations: ${error.message}`)
    }

    // Return empty array if no data (not an error)
    return (data || []) as PastSession[]
}

export const getOverallStatistics = async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('statistics') 
        .select('*')
        .single()

    if (error) {
        // If no rows found, that's not an error - just no statistics yet
        if (error.code === 'PGRST116') {
            return null
        }
        console.error("Error fetching user statistics: ", error)
        throw new Error(`Failed to fetch user statistics: ${error.message}`)
    }

    return data as Statistic
}

export const getUserAchievements = async () => {
    const supabase = await createClient()

    const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')

    if (achievementsError) {
        console.error("Error fetching user achievements: ", achievementsError)
        throw new Error(`Failed to fetch user achievements: ${achievementsError.message}`)
    }

    const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select('*')

    if (badgesError) {
        console.error("Error fetching badges: ", badgesError)
        throw new Error(`Failed to fetch badges: ${badgesError.message}`)
    }

    const achievementsMap = achievementsData.reduce((acc, achievement) => {
        acc[achievement.bid] = achievement.awarded_at
        return acc
    }, {} as Record<string, string>)

    const badges = badgesData.map((badge) => {
        const awarded = achievementsMap[badge.bid]
        const { criteria_type, criteria_value, ...rest } = badge
        return {
            ...rest,
            unlocked: awarded ? true : false,
            awarded: awarded || null
        }
    })

    return badges as DisplayBadge[]
}