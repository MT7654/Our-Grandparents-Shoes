import 'server-only'

import Groq from 'groq-sdk'

let client: Groq | undefined

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not set')
  }

  client ??= new Groq({ apiKey, maxRetries: 0 })
  return client
}

// A compact fallback response may only need the next few seconds of its output allowance.
// Daily quota errors should fall through immediately.
export async function withShortQuotaRetry<T>(model: string, request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  } catch (error) {
    const delay = error instanceof Error && /try again in ([\d.]+)(ms|s)\b/i.exec(error.message)
    if (!delay || !("status" in error) || error.status !== 429) throw error
    const ms = Math.ceil(Number(delay[1]) * (delay[2] === "ms" ? 1 : 1000)) + 300
    if (!Number.isFinite(ms) || ms > (model.startsWith("qwen/") ? 15000 : 5000)) throw error
    await new Promise(resolve => setTimeout(resolve, ms))
    return request()
  }
}
