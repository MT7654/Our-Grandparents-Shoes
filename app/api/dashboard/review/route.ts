import { NextResponse, type NextRequest } from 'next/server'
import { getConversationReviews } from '@/lib/dashboard/dashboard'
import { guard } from '@/lib/auth/guard'

/**
 * GET /api/dashboard/review?converseId=<vid>
 * Returns review for a single conversation (goodPrompts, needsImprovement, meta).
 */
export async function GET(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const { searchParams } = new URL(request.url)
        const converseId = searchParams.get('converseId')

        if (!converseId) {
            return NextResponse.json(
                { error: 'Missing converseId' },
                { status: 400 }
            )
        }

        const review = await getConversationReviews(converseId)
        return NextResponse.json({ review })
    } catch (error) {
        console.error('GET /api/dashboard/review error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load review'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}