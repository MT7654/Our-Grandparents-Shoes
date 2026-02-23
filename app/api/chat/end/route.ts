import { NextResponse, type NextRequest } from 'next/server'
import { endConversation, fetchCompleteConversation } from '@/lib/chat/service'
import { guard } from '@/lib/auth/guard'
import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * POST /api/chat/end
 * Body: { converseId }
 * Ends the conversation, runs completion evaluation, saves scores and feedback.
 */
export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }
        
        const body = await request.json()
        const converseId: Conversation['vid'] | undefined = body?.converseId
        const end_early: boolean | undefined = body?.end_early

        if (!converseId || end_early === undefined) {
            return NextResponse.json(
                { error: 'Conversation ID and required parameters are required' },
                { status: 400 }
            )
        }

        const savedConversation = await endConversation(converseId, end_early)

        if (!savedConversation) {
            return NextResponse.json(
                { error: 'Failed to save conversation' },
                { status: 400 }
            )
        }

        return NextResponse.json(savedConversation)
    } catch (error) {
        console.error('Error ending conversation: ', error)

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/chat/end?id=<converseId>
 * Returns completed conversation with scores and objective (for results page).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const converseId = searchParams.get('id')

        if (!converseId) {
            return NextResponse.json(
                { error: "Conversation ID is required" },
                { status: 400 }
            )
        }

        const complete_evaluation = await fetchCompleteConversation(converseId)

        if (!complete_evaluation) {
            return NextResponse.json(
                { error: 'Conversation not found or not completed' },
                { status: 404 }
            )
        }

        return NextResponse.json(complete_evaluation)
    } catch (error) {
        console.error('GET /chat/end error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversation results'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}