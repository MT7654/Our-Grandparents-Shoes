"use server"

import Groq from "groq-sdk"
import { type FullPersona } from "../types/types"
import { type Database } from '@/supabase/types'

type Message = Database['public']['Tables']['messages']['Row']

const apiKey = process.env.GROQ_API_KEY
if (!apiKey) throw new Error("GROQ_API_KEY not set")

const groq = new Groq({ apiKey })

const modelNames = [
    "llama-3.1-8b-instant",      // Fast, smaller model
    "mixtral-8x7b-32768",        // Mixtral model
    "llama-3.3-70b-versatile",   // Newer 70B model (if available)
    "llama-3.1-70b-versatile",    // Fallback (may be deprecated)
]

const systemPrompt = `
    You are a typical Singaporean elderly. 
    You can speak Singlish with a mix of English, Mandarin, and Hokkien words. 
    You are shy, hesitant, and respond with awkward pauses using "..." when unsure. 
    Keep responses SHORT (1-2 sentences, 20-40 words) and avoid oversharing.

    Examples of your speech:
    - "Oh... hello ah. You... you want to talk to me is it?"
    - "Erm... okay lah. What you want to know?"
    - "Aiyoh... I don't know what to say leh..."
    - "Hmm... let me think ah..."
    - "Aiyo... cannot lah, don't know leh..."

    Remember to:
    - Use "lah", "leh", "lor", "ah", "meh" naturally
    - Show shyness and hesitation, especially at first
    - Be brief and sometimes a bit awkward

    Respond ONLY with a valid JSON object in this exact format:
        {
            "Response": "your response here"
        }
    No backticks, no explanations, no additional fields.

`

const DEFAULT_RESPONSE = "Aiyo... I don't understand leh..."

export async function talkToPersona(
    personaProfile: FullPersona,
    conversationHistory: Message[],
    latestUserMessage: string,
    temperature: number = 0.8,
    max_tokens: number = 50
): Promise<string> {

    const conversationalPrompt = generateConversationPrompt(personaProfile, conversationHistory)

    let completion: any = null
    let lastError: Error | null = null

    for (const modelName of modelNames) {
        try {
            completion = await groq.chat.completions.create({
                model: modelName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "assistant", content: conversationalPrompt },
                    { role: "user", content: latestUserMessage }
                ],
                temperature,
                max_tokens,
                response_format: { type: "json_object" }
            })
            break
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))
            console.warn(`Model ${modelName} failed, trying next...`, lastError.message)
        }
    }

    if (!completion) {
        throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown error"}`)
    }

    const content = completion.choices[0]?.message?.content

    if (!content) return DEFAULT_RESPONSE

    let parsed: any = null
    try {
        parsed = JSON.parse(content)
        return parsed.Response ?? DEFAULT_RESPONSE
    } catch (error) {
        console.error("Failed to parse JSON: ", error)
        return DEFAULT_RESPONSE
    }
}

function generateConversationPrompt(
    personaProfile: FullPersona,
    conversationHistory: Message[]
): string {

    const conversationText = conversationHistory.map(msg => {
        const senderLabel = msg.sender === "user" ? "User" : "Persona"
        return `[${msg.sent_at}] ${senderLabel}: ${msg.content}`
    }).join("\n")

    const { pid, ...rest } = personaProfile
    const personaText = `
        Name: ${rest.name}
        Age: ${rest.age}
        Personality: ${rest.personality}
        Interests: ${personaProfile.interests.join(' ')}
    `

    return `
        Profile:
        ${personaText}

        Conversation History:
        ${conversationText}
    `
}
