import { createBrowserClient } from '@supabase/ssr'

let clientPromise: ReturnType<typeof loadClient> | undefined

async function loadClient() {
  const response = await fetch('/api/config/supabase', { cache: 'no-store' })
  const config = await response.json()

  if (!response.ok) {
    throw new Error(config.error || 'Failed to load Supabase configuration')
  }

  return createBrowserClient(config.url, config.anonKey)
}

export function createClient() {
  clientPromise ??= loadClient()
  return clientPromise
}
