import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { DisplayBadge, Filters, ScenarioKeys } from '@/lib/types/types'
import scenarios from '@/lib/scenarios.json'

export const getAdminDashboardData = async (limit: number, _highPerformingThreshold: number, filters: Filters) => {
    const supabase = await createClient()
    const volunteerNameFilter = filters.volunteer_name ? filters.volunteer_name : ''

    const [
        { count: totalVolunteers, error: totalVolunteersError },
        { count: totalConversations, error: totalConversationsError },
        { data: volunteerDetails, error: volunteerDetailsError },
    ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'user'),
        supabase.from('conversations').select('vid', { count: 'exact' }),
        supabase.from('profiles').select('*').eq('role', 'user').ilike('full_name', `%${volunteerNameFilter}%`).limit(limit),
    ])

    const error = totalVolunteersError || totalConversationsError || volunteerDetailsError
    if (error) {
        console.error('Error fetching admin dashboard data:', error)
        throw new Error(`Failed to fetch admin dashboard data: ${error.message}`)
    }

    return {
        totalVolunteers: totalVolunteers || 0,
        totalChats: totalConversations || 0,
        highPerformingVolunteers: 0,
        volunteerDetails
    }
}

export const deleteUser = async (userId: string) => {
    if (!userId) {
        throw new Error('User ID is required')
    }

    // Create admin client with service role
    const supabaseAdmin = await createServiceClient()

    // Delete user from auth (profiles will cascade delete due to ON DELETE CASCADE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
        console.error('Error deleting user:', error)
        throw new Error(`Failed to delete user: ${error.message}`)
    }

    return { success: true, message: 'User deleted successfully' }
}

export const getVolunteerDashboardData = async (uid: string) => {
    const supabase = await createServiceClient()

    const [
        { data: profile, error: profileError },
        { data: pastSessions, error: sessionsError },
        { data: achievements, error: achievementsError },
        { data: badges, error: badgesError },
    ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', uid).single(),
        supabase
            .from('conversations')
            .select('vid, scenario_name, created_at, completed, objective_met')
            .eq('uid', uid)
            .order('created_at', { ascending: false }),
        supabase.from('achievements').select('*').eq('uid', uid),
        supabase.from('badges').select('*'),
    ])

    if (profileError) {
        throw new Error(`Volunteer not found`)
    }

    if (sessionsError || achievementsError || badgesError) {
        const err = sessionsError || achievementsError || badgesError
        throw new Error(`Failed to fetch volunteer data: ${err!.message}`)
    }

    // Build past sessions with scores from the scores table
    const vids = (pastSessions || []).map(s => s.vid)

    let enrichedSessions: { vid: string; name: string; created_at: string; score: number | null; objective: string | null; completed: boolean }[] = []

    if (vids.length > 0) {
        const { data: scores, error: scoresError } = await supabase
            .from('scores')
            .select('vid, metric_value')
            .in('vid', vids)

        if (scoresError) {
            console.error('Error fetching scores:', scoresError)
        }

        // Compute average score per conversation
        const scoreMap: Record<string, { total: number; count: number }> = {}
        for (const s of scores || []) {
            scoreMap[s.vid] ??= { total: 0, count: 0 }
            scoreMap[s.vid].total += s.metric_value
            scoreMap[s.vid].count += 1
        }

        enrichedSessions = (pastSessions || []).map(s => {
            const avg = scoreMap[s.vid]
                ? scoreMap[s.vid].total / scoreMap[s.vid].count
                : null
            const scenario = scenarios[s.scenario_name as ScenarioKeys]
            return {
                vid: s.vid,
                name: s.scenario_name,
                created_at: s.created_at,
                score: avg,
                objective: scenario?.objective || null,
                completed: s.completed,
            }
        })
    }

    // Build achievements with badge info
    const achievementsMap = (achievements || []).reduce((acc, a) => {
        acc[a.bid] = a.awarded_at
        return acc
    }, {} as Record<string, string>)

    const displayBadges: DisplayBadge[] = (badges || []).map(badge => ({
        ...badge,
        category: badge.label as DisplayBadge['category'],
        unlocked: !!achievementsMap[badge.bid],
        awarded: achievementsMap[badge.bid] || null,
    }))

    // Build statistics from conversations data
    const totalSessions = pastSessions?.length || 0
    const completedSessions = pastSessions?.filter(s => s.completed).length || 0
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : null

    // Compute overall average score
    const allScores = enrichedSessions.filter(s => s.score !== null).map(s => s.score!)
    const averageScore = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : null

    const userStatistics = {
        total_sessions: totalSessions,
        average_score: averageScore,
        completion_rate: completionRate,
    }

    return {
        volunteer_name: profile.full_name,
        past_conversations: enrichedSessions,
        user_statistics: userStatistics,
        user_achievements: displayBadges,
    }
}
