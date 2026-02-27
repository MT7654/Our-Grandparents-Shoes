import { NextResponse, type NextRequest } from 'next/server'
import { converseEvaluate } from '@/lib/chat/service'
import { guard } from '@/lib/auth/guard'

/**
 * POST /api/chat/evaluate
 * Body: { converseId, userMessageId, personaMessageId }
 * Phase 2: Runs evaluation, updates feedback, rapport, completion, and turns.
 */
export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const body = (await request.json()) as {
            converseId: string,
            userMessageId: string,
            personaMessageId: string
        }
        const { converseId, userMessageId, personaMessageId } = body

        if (!converseId || !userMessageId || !personaMessageId) {
            return NextResponse.json(
                { error: 'converseId, userMessageId, and personaMessageId are required' },
                { status: 400 }
            )
        }

        const data = await converseEvaluate(converseId, userMessageId, personaMessageId)

        if (!data) {
            return NextResponse.json(
                { error: 'Failed to evaluate response. Please try again.' },
                { status: 422 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('POST /chat/evaluate error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to evaluate message'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
