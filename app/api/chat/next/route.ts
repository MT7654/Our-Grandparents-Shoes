import { NextResponse, type NextRequest } from 'next/server'
import { converse } from '@/lib/chat/service'
import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']

export async function POST(request:NextRequest) {
    try {
        const body = (await request.json()) as { 
            converseId: Conversation['vid'], 
            latestMessage: Message['content']
        }
        const { converseId, latestMessage } = body

        if (!converseId || latestMessage === null || latestMessage === undefined) {
            return NextResponse.json(
                { error: 'Conversation ID and message are required'},
                { status: 400 }
            )
        }

        if (typeof latestMessage !== 'string' || latestMessage.trim().length === 0) {
            return NextResponse.json(
                { error: 'Message cannot be empty'},
                { status: 400 }
            )
        }

        const data = await converse(converseId, latestMessage)

        if (!data) {
            return NextResponse.json(
                { error: "Failed to generate response. Please try again." },
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