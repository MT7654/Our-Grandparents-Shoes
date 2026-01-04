import { NextResponse, type NextRequest } from 'next/server'
import { getAdminDashboardData } from '@/lib/admin/service'
import { guard } from '@/lib/auth/guard'

export async function POST(request: NextRequest) {
    try {
        const guardResult = await guard('admin')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const body = await request.json()
        const { limit, highPerformingThreshold, filters } = body

        if (!limit || !highPerformingThreshold || !filters) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const data = await getAdminDashboardData(limit, highPerformingThreshold, filters)

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}