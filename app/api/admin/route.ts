import { NextResponse, type NextRequest } from 'next/server'
import { getAdminDashboardData, deleteUser } from '@/lib/admin/service'
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
export async function DELETE(request: NextRequest) {
    try {
        const guardResult = await guard('admin')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }

        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const result = await deleteUser(userId)

        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        console.error('Error deleting user:', error)
        const errorMessage = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
