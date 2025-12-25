import { NextResponse, type NextRequest } from 'next/server'
import { endConversation, fetchCompleteConversation } from '@/lib/chat/service'

import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const converseId: Conversation['vid'] | undefined = body?.converseId

        if (!converseId) {
            return NextResponse.json(
                { error: 'Converse ID is required'},
                { status: 400 }
            )
        }

        const savedConversation = await endConversation(converseId)
        
        if (!savedConversation) {
            return NextResponse.json(
                { error: 'Failed to save conversation'},
                { status: 400 }
            )
        }

        return NextResponse.json(savedConversation)
    } catch (error) {
        console.error('Error ending conversation: ', error)

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const converseId = searchParams.get("id")

        if (!converseId) {
            return NextResponse.json(
                { error: "Conversation ID is required" },
                { status: 400 }
            )
        }

        const complete_evaluation = await fetchCompleteConversation(converseId)

        if (!complete_evaluation) {
            return NextResponse.json(
                { error: `Conversation with ID "${converseId}" not found or not completed` },
                { status: 404 }
            )
        }

        return NextResponse.json(complete_evaluation)
    } catch (error) {
        console.error('GET /chat/end error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversation results'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}