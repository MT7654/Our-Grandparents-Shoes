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

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found or could not be created" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                message: 'User Conversation Loaded',
                ...conversation
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('POST /conversation error: ', error)
        return NextResponse.json(
            { error: 'Internal Server Error'},
            { status: 500 }
        )
    }
}