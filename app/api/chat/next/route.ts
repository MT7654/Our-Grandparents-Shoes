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

        if (!converseId || latestMessage === null) {
            return NextResponse.json(
                { error: 'Converse ID and Message are required'},
                { status: 400 }
            )
        }

        const data = await converse(converseId, latestMessage)

        if (!data) {
            return NextResponse.json(
                { error: "Unable to retrieve reply and evaluation" },
                { status: 422 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('POST /conversation error: ', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}