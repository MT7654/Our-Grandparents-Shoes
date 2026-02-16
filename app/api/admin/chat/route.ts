import { NextResponse, type NextRequest } from 'next/server'
import { getMessages } from '@/lib/chat/message'
import { guard } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
    try {
        const guardResult = await guard('admin')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const vid = request.nextUrl.searchParams.get('vid')

        if (!vid) {
            return NextResponse.json(
                { error: 'Conversation ID is required' },
                { status: 400 }
            )
        }

        const messages = await getMessages(vid)

        return NextResponse.json({ messages })
    } catch (error) {
        console.error('GET /api/admin/chat error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
