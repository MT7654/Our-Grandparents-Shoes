import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ChatData, DisplayBadge, Filters } from '@/lib/types/types'

export const getAdminDashboardData = async (limit: number, highPerformingThreshold: number, filters: Filters) => {
    const supabase = await createClient()   
    const volunteerNameFilter = filters.volunteer_name ? filters.volunteer_name : ''
    const personaNameFilter = filters.persona_name ? filters.persona_name : ''

    const [
        { count: totalVolunteers, error: totalVolunteersError },
        { count: totalChats, error: totalChatsError },
        { data: volunteerDetails, error: volunteerDetailsError },
        { data: chatProgression, error: chatProgressionError },
    ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'user'),
        supabase.from('chats').select('cid', { count: 'exact' }),
        supabase.from('statistics_by_volunteers').select('*').ilike('full_name', `%${volunteerNameFilter}%`).limit(limit),
        supabase.from('volunteer_chat_progression').select('*').ilike('persona_name', `%${personaNameFilter}%`).limit(limit),
    ])

    const error = totalVolunteersError || totalChatsError || volunteerDetailsError || chatProgressionError
    if (error) {
        console.error('Error fetching admin dashboard data:', error)
        throw new Error(`Failed to fetch admin dashboard data: ${error.message}`)
    }

    const highPerformingVolunteers = volunteerDetails?.filter(volunteer => volunteer.average_score > highPerformingThreshold).length || 0

    const grouped = chatProgression?.reduce<Record<string, any[]>>((acc, row) => {
        const key = `${row.cid},${row.uid}`
        acc[key] ??= []
        acc[key].push(row)
        return acc
    }, {} as Record<string, any[]>)

    Object.values(grouped).forEach(rows => 
        rows.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    )
    
    const chatProgressWithRawScores = Object.values(grouped).reduce<Record<string, any[][]>>(
        (acc, rows) => {
            rows.forEach((row, index) => {
                acc[row.cid] ??= []
                acc[row.cid][index] ??= []
                acc[row.cid][index].push({
                    persona_name: row.persona_name,
                    chat_objective: row.chat_objective,
                    score: row.score
                })
            })
            return acc
        }, {} as Record<string, any[][]>
    )

    const chatProgressWithAverageScores: ChatData[] = []

    for (const [cid, attempts] of Object.entries(chatProgressWithRawScores)) { 
        const triesAgainstScore = attempts.map((scores, i) => ({
            tries: i + 1, 
            averageScore: scores.reduce((sum, s) => sum + s.score, 0) / scores.length
        }))

        chatProgressWithAverageScores.push({
            cid,
            persona_name: attempts[0][0].persona_name,
            chat_objective: attempts[0][0].chat_objective,
            triesAgainstScore,
        })
    }

    return {
        totalVolunteers: totalVolunteers || 0,
        totalChats: totalChats || 0,
        highPerformingVolunteers,
        volunteerDetails,
        chatProgressWithAverageScores
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
        { data: volunteerStats, error: statsError },
        { data: pastSessions, error: sessionsError },
        { data: achievements, error: achievementsError },
        { data: badges, error: badgesError },
    ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', uid).single(),
        supabase.from('statistics_by_volunteers').select('*').eq('uid', uid).single(),
        supabase
            .from('conversations')
            .select('vid, cid, created_at, completed')
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

    // Build past sessions with scores by joining with average_score_conversations, chats, and personas
    const vids = (pastSessions || []).map(s => s.vid)

    let enrichedSessions: { vid: string | null; name: string | null; created_at: string | null; score: number | null; objective: string | null; completed: boolean | null }[] = []

    if (vids.length > 0) {
        const [
            { data: scores, error: scoresError },
        ] = await Promise.all([
            supabase.from('average_score_conversations').select('*').in('vid', vids),
        ])

        if (scoresError) {
            console.error('Error fetching scores:', scoresError)
        }

        const scoreMap = (scores || []).reduce((acc, s) => {
            if (s.vid) acc[s.vid] = s.score
            return acc
        }, {} as Record<string, number | null>)

        // Get chat details for cids
        const cids = [...new Set((pastSessions || []).map(s => s.cid))]
        const { data: chats } = await supabase
            .from('chats')
            .select('cid, pid, objective')
            .in('cid', cids)

        const chatMap = (chats || []).reduce((acc, c) => {
            acc[c.cid] = c
            return acc
        }, {} as Record<string, { cid: string; pid: string; objective: string }>)

        // Get persona names
        const pids = [...new Set((chats || []).map(c => c.pid))]
        const { data: personas } = await supabase
            .from('personas')
            .select('pid, name')
            .in('pid', pids)

        const personaMap = (personas || []).reduce((acc, p) => {
            acc[p.pid] = p.name
            return acc
        }, {} as Record<string, string>)

        enrichedSessions = (pastSessions || []).map(s => {
            const chat = chatMap[s.cid]
            return {
                vid: s.vid,
                name: chat ? personaMap[chat.pid] || null : null,
                created_at: s.created_at,
                score: scoreMap[s.vid] || null,
                objective: chat?.objective || null,
                completed: s.completed,
            }
        })
    }

    // Build achievements with badge info
    const achievementsMap = (achievements || []).reduce((acc, a) => {
        acc[a.bid] = a.awarded_at
        return acc
    }, {} as Record<string, string>)

    const displayBadges: DisplayBadge[] = (badges || []).map(badge => {
        const awarded = achievementsMap[badge.bid]
        const { criteria_type, criteria_value, ...rest } = badge
        return {
            ...rest,
            unlocked: !!awarded,
            awarded: awarded || null,
        }
    })

    // Build statistics object matching the dashboard format
    const userStatistics = statsError ? null : {
        total_sessions: volunteerStats?.total_sessions || 0,
        average_score: volunteerStats?.average_score || null,
        completion_rate: volunteerStats?.completion_rate || null,
        best_category: null as string | null,
    }

    return {
        volunteer_name: profile.full_name,
        past_conversations: enrichedSessions,
        user_statistics: userStatistics,
        user_achievements: displayBadges,
    }
}
