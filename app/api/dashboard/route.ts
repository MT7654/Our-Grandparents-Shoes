import { NextResponse } from 'next/server'
import { getPastConversations, getUserAchievements } from '@/lib/dashboard/dashboard'
import { guard } from '@/lib/auth/guard'

/**
 * GET /api/dashboard
 * Returns past conversations, overall statistics, and user achievements for the authenticated user.
 */
export async function GET() {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }
        
        const past_conversations = await getPastConversations()
        const user_achievements = await getUserAchievements()

        // Return empty arrays/null instead of errors for empty states
        // This allows frontend to distinguish between "no data" and "error"
        return NextResponse.json({
            past_conversations: past_conversations || [],
            user_achievements: user_achievements || []
        })
    } catch (error) {
        console.error('GET /dashboard error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}