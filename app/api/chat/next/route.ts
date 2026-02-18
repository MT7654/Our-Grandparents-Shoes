import { NextResponse, type NextRequest } from 'next/server'
import { converse } from '@/lib/chat/service'
import type { Database } from '@/supabase/types'
import { guard } from '@/lib/auth/guard'

type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']

/**
 * POST /api/chat/next
 * Body: { converseId, latestMessage }
 * Processes one user message: saves it, gets persona reply and evaluation, returns new state.
 */
export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }
        
        const body = (await request.json()) as { 
            converseId: Conversation['vid'], 
            latestMessage: Message['content']
        }
        const { converseId, latestMessage } = body

        if (!converseId || latestMessage === null || latestMessage === undefined) {
            return NextResponse.json(
                { error: 'Conversation ID and message are required' },
                { status: 400 }
            )
        }

        if (typeof latestMessage !== 'string' || latestMessage.trim().length === 0) {
            return NextResponse.json(
                { error: 'Message cannot be empty' },
                { status: 400 }
            )
        }

        const data = await converse(converseId, latestMessage)

        if (!data) {
            return NextResponse.json(
                { error: 'Failed to generate response. Please try again.' },
                { status: 422 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('POST /chat/next error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to process message'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}