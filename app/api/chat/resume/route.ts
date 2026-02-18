import { NextResponse, type NextRequest } from 'next/server'
import { resumeConversation } from '@/lib/chat/service'
import { type ScenarioKeys } from '@/lib/types/types'
import { guard } from '@/lib/auth/guard'
import scenarios from '@/lib/scenarios.json'

/**
 * POST /api/chat/resume
 * Body: { scenario_name }
 * Resumes the user's in-progress conversation for the given scenario, or returns not-found payload.
 */
export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const body = await request.json()
        const scenario_name: ScenarioKeys | undefined = body?.scenario_name

        if (!scenario_name) {
            return NextResponse.json(
                { error: 'Scenario name is required' },
                { status: 400 }
            )
        }

        if (!(scenario_name in scenarios)) {
            return NextResponse.json(
                { error: 'Scenario name invalid' },
                { status: 404 }
            )
        }

        const conversation = await resumeConversation(scenario_name)

        if (conversation == null) {
            return NextResponse.json(
                { message: 'User Conversation not found' },
                { status: 200 }
            )
        }
        return NextResponse.json(
            { message: 'User Conversation Loaded', ...conversation },
            { status: 200 }
        )
    } catch (error) {
        console.error('POST /chat/resume error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to resume conversation'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
