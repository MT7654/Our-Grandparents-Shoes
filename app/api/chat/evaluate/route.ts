import { isUuid } from "@/lib/chat/live-rules"
import { LiveChatError } from "@/lib/chat/live-persistence"
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

        if (![converseId, userMessageId, personaMessageId].every(isUuid)) {
            return NextResponse.json(
                { error: 'converseId, userMessageId, and personaMessageId are required' },
                { status: 400 }
            )
        }

        const data = await converseEvaluate(converseId, userMessageId, personaMessageId, guardResult.session.user.id)

        if (!data) {
            return NextResponse.json(
                { error: 'Failed to evaluate response. Please try again.' },
                { status: 422 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        if (error instanceof LiveChatError) {
            return NextResponse.json({ error: error.message }, { status: error.status })
        }
        console.error('POST /chat/evaluate error: ', error)
        return NextResponse.json(
            { error: 'Feedback could not be generated. You can retry the assessment.' },
            { status: 500 }
        )
    }
}
