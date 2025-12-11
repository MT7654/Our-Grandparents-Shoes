import { NextResponse, type NextRequest } from 'next/server'
import { startConversation } from '@/lib/chat/service'
import type { Database } from '@/supabase/types'

type Persona = Database['public']['Tables']['personas']['Row']

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const personaId: Persona['pid'] | undefined = body?.personaId

        if (!personaId) {
            return NextResponse.json(
                { error: 'Persona ID is required'},
                { status: 400 }
            )
        }

        const conversation = await startConversation(personaId)

        return NextResponse.json(
            {
                message: 'User Conversation Loaded',
                ...conversation
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('POST /chat/start error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}