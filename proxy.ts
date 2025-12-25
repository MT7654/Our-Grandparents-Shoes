import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { validatePath } from './lib/auth/middleware'

export async function proxy(request: NextRequest) {
  const path_response = await validatePath(request)

  // Check for redirection
  if (path_response.status && path_response.status >= 300 && path_response.status < 400) {
    return path_response 
  }

  // Continue
  return await updateSession(request) 
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, svgs, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}