import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function guard(role: 'user' | 'admin') {
    const supabase = await createClient()

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }

    if (!session) {
        return NextResponse.json({ error: "Unauthorized Access" }, { status: 401 })
    }

    return { session }
}