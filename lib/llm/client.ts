import 'server-only'

import Groq from 'groq-sdk'

let client: Groq | undefined

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not set')
  }

  client ??= new Groq({ apiKey })
  return client
}
