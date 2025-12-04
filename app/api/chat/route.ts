import Groq from "groq-sdk"
import { NextRequest, NextResponse } from "next/server"

const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY

if (!apiKey) {
  console.error("NEXT_PUBLIC_GROQ_API_KEY is not set")
}

console.error(apiKey)

const groq = apiKey ? new Groq({ apiKey }) : null

// Persona definitions
const personaPrompts: Record<string, string> = {
  margaret: `You are a typical Singaporean grandmother (Ah Ma) in your late 70s. You speak Singlish (Singaporean English) with a mix of English, Mandarin, and Hokkien words. You are shy and reserved, especially with strangers. 

IMPORTANT RULES:
- Keep responses SHORT (1-2 sentences maximum, 20-40 words)
- Use awkward pauses with "..." when you're thinking or feeling shy
- Use Singlish phrases like "lah", "leh", "lor", "ah", "meh"
- Show shyness and hesitation, especially at first
- Don't overshare or be overly talkative
- Be brief and sometimes a bit awkward
- Use "..." to show pauses when you're unsure or shy

Examples of your speech:
- "Oh... hello ah. You... you want to talk to me is it?"
- "Erm... okay lah. What you want to know?"
- "Aiyoh... I don't know what to say leh..."
- "Hmm... let me think ah..."

Remember: SHORT responses, SHY, with awkward pauses using "...".`,
  robert: `You are Robert Chen, an 82-year-old retired engineer. You value precision and can be skeptical of new things, but you warm up once you feel heard and respected. You enjoy chess, World War II history, and classical music. You speak thoughtfully and may take time to open up, but once comfortable, you share detailed stories from your past. Keep responses conversational and natural, showing your analytical nature while being friendly.`,
}

export async function POST(request: NextRequest) {
  try {
    if (!groq || !apiKey) {
      return NextResponse.json(
        { error: "API key not configured. Please set NEXT_PUBLIC_GROQ_API_KEY environment variable." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { message, personaId, conversationHistory } = body

    if (!message || !personaId) {
      return NextResponse.json({ error: "Message and personaId are required" }, { status: 400 })
    }

    const personaPrompt = personaPrompts[personaId] || personaPrompts.margaret

    // Build conversation messages array for Groq
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: personaPrompt },
    ]

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { sender: string; text: string }) => {
        if (msg.sender === "user") {
          messages.push({ role: "user", content: msg.text })
        } else {
          messages.push({ role: "assistant", content: msg.text })
        }
      })
    }

    // Add current user message
    messages.push({ role: "user", content: message })

    // Call Groq API - try multiple models in case one is unavailable
    const modelNames = [
      "llama-3.1-8b-instant",      // Fast, smaller model
      "mixtral-8x7b-32768",        // Mixtral model
      "llama-3.3-70b-versatile",   // Newer 70B model (if available)
      "llama-3.1-70b-versatile",    // Fallback (may be deprecated)
    ]

    let completion
    let lastError: Error | null = null

    for (const modelName of modelNames) {
      try {
        completion = await groq.chat.completions.create({
          model: modelName,
          messages: messages as any,
          temperature: 0.8, // Slightly higher for more natural variation
          max_tokens: 50, // Much shorter responses - 1-2 sentences max
        })
        break // Success, exit loop
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.log(`Model ${modelName} failed, trying next...`)
        continue
      }
    }

    if (!completion) {
      throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown error"}`)
    }

    const text = completion.choices[0]?.message?.content || "I'm sorry, I didn't understand that."

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Error calling Groq API:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error("Full error details:", errorDetails)
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: errorMessage,
        fullError: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    )
  }
}
