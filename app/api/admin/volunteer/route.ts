import { NextResponse, type NextRequest } from 'next/server'
import { getVolunteerDashboardData } from '@/lib/admin/service'
import { guard } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
    try {
        const guardResult = await guard('admin')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const uid = request.nextUrl.searchParams.get('uid')

        if (!uid) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const data = await getVolunteerDashboardData(uid)

        return NextResponse.json(data)
    } catch (error) {
        console.error('GET /api/admin/volunteer error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
