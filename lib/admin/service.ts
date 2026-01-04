import { createClient } from '@/lib/supabase/server'
import type { ChatData, Filters } from '@/lib/types/types'

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
