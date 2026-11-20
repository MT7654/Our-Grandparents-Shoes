import { isUuid } from "@/lib/chat/live-rules"
import { LiveChatError } from "@/lib/chat/live-persistence"
import { NextResponse, type NextRequest } from 'next/server'
import { converseReply } from '@/lib/chat/service'
import type { Database } from '@/supabase/types'
import { guard } from '@/lib/auth/guard'

type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']

/**
 * POST /api/chat/next
 * Body: { converseId, latestMessage }
 * Phase 1: Gets persona reply quickly, saves messages, returns without waiting for evaluation.
 */
export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }
        
        const body = (await request.json()) as {
            converseId: Conversation['vid'],
            latestMessage: Message['content'],
            turnId?: string
        }
        const { converseId, latestMessage, turnId } = body

        if (!isUuid(converseId) || (turnId !== undefined && !isUuid(turnId)) || latestMessage === null || latestMessage === undefined) {
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

        const data = await converseReply(converseId, latestMessage, turnId ?? crypto.randomUUID(), guardResult.session.user.id)

        if (!data) {
            return NextResponse.json(
                { error: 'Failed to generate response. Please try again.' },
                { status: 422 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        if (error instanceof LiveChatError) {
            return NextResponse.json({ error: error.message }, { status: error.status })
        }
        console.error('POST /chat/next error: ', error)
        return NextResponse.json(
            { error: 'Margaret could not reply right now. Your turn has not been used; please retry.' },
            { status: 500 }
        )
    }
}