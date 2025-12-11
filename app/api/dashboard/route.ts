import { NextResponse } from 'next/server'
import { getPastConversations, getOverallStatistics } from '@/lib/dashboard/dashboard'

export async function GET() {
    try {
        const past_conversations = await getPastConversations()
        const user_statistics = await getOverallStatistics()

        // Return empty arrays/null instead of errors for empty states
        // This allows frontend to distinguish between "no data" and "error"
        return NextResponse.json({
            past_conversations: past_conversations || [],
            user_statistics: user_statistics || null,
        })
    } catch (error) {
        console.error("GET /dashboard error: ", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data"
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}