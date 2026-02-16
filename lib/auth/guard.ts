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

    // Get user's role from profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

    if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError)
        return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Verify role authorization
    if (profile.role !== role) {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    // Update last_active timestamp
    const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_active: today })
        .eq('user_id', session.user.id)

    if (updateError) {
        console.error('Error updating last_active:', updateError)
        // Don't fail the request if last_active update fails
    }

    return { session, profile }
}