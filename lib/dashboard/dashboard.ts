import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'
import type { DisplayBadge, Review } from '@/lib/types/types'

type PastSession = Database['public']['Views']['conversation_sessions']['Row']
type ReviewSession = Database['public']['Views']['review_sessions']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * Fetches the current user's past conversation sessions (for dashboard list).
 */
export const getPastConversations = async () => {
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

/**
 * Fetches review for a conversation: one Review with scenario, difficulty, date,
 * objective_met, and messages grouped into goodPrompts and needsImprovement.
 */
export const getConversationReviews = async (
    converseID: ReviewSession['vid']
): Promise<Review | null> => {
    const supabase = await createClient()

    const [reviewResult, convoResult] = await Promise.all([
        supabase.from('review_sessions').select('*').eq('vid', converseID),
        supabase.from('conversations').select('*').eq('vid', converseID).single(),
    ]);

    const reviewData = reviewResult.data as ReviewSession[]
    const convoData = convoResult.data as Conversation

    if (reviewResult.error) {
        console.error("Error fetching conversation reviews: ", reviewResult.error)
        throw new Error(`Failed to fetch conversation reviews: ${reviewResult.error.message}`)
    }

    if (convoResult.error) {
        console.error("Error fetching conversation: ", convoResult.error)
        throw new Error(`Failed to fetch conversation: ${convoResult.error.message}`)
    }

    if (!convoData) {
        console.error("Error fetching conversation: Conversation not found")
        throw new Error('Failed to fetch conversation: Conversation not found')
    }

    const rows = (reviewData || []) as ReviewSession[]

    const goodPrompts = rows
        .filter((r) => r.status === 'good' && r.content != null && r.feedback != null)
        .map((r) => ({ userMessage: r.content!, explanation: r.feedback! }))
    const needsImprovement = rows
        .filter((r) => r.status === 'needs improvement' && r.content != null && r.feedback != null)
        .map((r) => ({ userMessage: r.content!, explanation: r.feedback! }))

    const review: Review = {
        scenario: convoData.scenario_name,
        difficulty: convoData.difficulty,
        date: convoData.created_at,
        objective_met: convoData.objective_met,
        feedback: convoData.feedback,
        goodPrompts,
        needsImprovement,
    }

    return review
}

/**
 * Fetches all badges with unlocked/awarded state for the current user.
 */
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