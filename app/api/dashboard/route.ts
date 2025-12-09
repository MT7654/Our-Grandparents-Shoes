import { NextResponse } from 'next/server'
import { getPastConversations, getOverallStatistics } from '@/lib/dashboard/dashboard'

export async function GET() {
    try {
        const past_conversations = await getPastConversations()

        const user_statistics = await getOverallStatistics()

        return NextResponse.json({
            past_conversations,
            user_statistics,
        })
    } catch (error) {
        console.error("GET /dashboard error: ", error)
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}