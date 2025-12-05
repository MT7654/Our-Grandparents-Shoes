import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function validatePath(request: NextRequest) {
    const path = request.nextUrl.pathname
    const protectedPaths = ['/personas', '/dashboard', '/complete', '/chat']
    const isProtected = protectedPaths.some((p) => path.startsWith(p))

    if (isProtected) {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll() {}, // No-op for validation check
                },
            },
        )

        const { data: { session }, error } = await supabase.auth.getSession() 

        if (error || !session) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return NextResponse.next({
        request,
    })
}