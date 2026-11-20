import { LiveChatError } from "@/lib/chat/live-persistence"
import { practiceContext } from '@/lib/visits/context'
import { NextResponse, type NextRequest } from 'next/server'
import { startConversation } from '@/lib/chat/service'
import { type ScenarioKeys } from '@/lib/types/types'
import { guard } from '@/lib/auth/guard'
import scenarios from '@/lib/scenarios.json'
import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * POST /api/chat/start
 * Body: { scenario_name, difficulty_level }
 * Starts a new conversation or returns existing in-progress conversation for the scenario.
 */
export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const body = await request.json()
        const scenario_name: ScenarioKeys | undefined = body?.scenario_name
        const difficulty_level: Conversation['difficulty'] | undefined = body?.difficulty_level

        if (!scenario_name || !difficulty_level) {
            return NextResponse.json(
                { error: 'Scenario name and difficulty level are required' },
                { status: 400 }
            )
        }

        if (!(scenario_name in scenarios)) {
            return NextResponse.json(
                { error: 'Scenario name invalid' },
                { status: 404 }
            )
        }
        if (difficulty_level !== 'Easy' && difficulty_level !== 'Hard') {
            return NextResponse.json(
                { error: 'Difficulty level must be Easy or Hard' },
                { status: 400 }
            )
        }

        const context = await practiceContext(body.context, scenario_name, guardResult.session.user.id)
        const conversation = await startConversation(guardResult.session.user.id, scenario_name, context.difficulty ?? difficulty_level, context.key, context.callback, context.challenge ?? body.challenge)

        return NextResponse.json(
            {
                message: 'User Conversation Loaded',
                ...conversation
            },
            { status: 200 }
        )
    } catch (error) {
        if (error instanceof LiveChatError) {
            return NextResponse.json({ error: error.message }, { status: error.status })
        }
        console.error('POST /chat/start error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}