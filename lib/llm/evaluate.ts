"use server"

import Groq from "groq-sdk"
import { MidConversationEvaluation, type FullPersona } from "../types/types"
import { type Database } from '@/supabase/types'

type Message = Database['public']['Tables']['messages']['Row']

const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
if (!apiKey) throw new Error("NEXT_PUBLIC_GROQ_API_KEY not set")

const groq = new Groq({ apiKey })

const modelNames = [
    "llama-3.1-8b-instant",      // Fast, smaller model
    "mixtral-8x7b-32768",        // Mixtral model
    "llama-3.3-70b-versatile",   // Newer 70B model (if available)
]

const systemPrompt = `
    You are an expert conversation coach evaluating a conversation between a user and a senior persona. 
    Analyze the user's message and the persona's response.

    Instructions:
        1. Sentiment: "positive", "neutral", or "negative" — based on how the user's message would make the senior feel
        2. Expression: "happy", "neutral", "sad", or "angry" — the emotional expression the senior would show
        3. Rapport change: a number between -10 and +15 indicating how much the rapport improved or worsened
        4. Suggestion: a helpful coaching tip (1-2 sentences) for the user to improve their conversation skills

    Respond ONLY with a valid JSON object in this exact format:
        {
            "sentiment": "positive|neutral|negative",
            "expression": "happy|neutral|sad|angry",
            "rapportChange": <number>,
            "suggestion": "<coaching tip>"
        }
`

export async function evaluateResponse(
    persona: FullPersona,
    lastMessage: string,
    history: Message[],
    objective: string,
    temperature = 0.3,
    max_tokens = 200
): Promise<MidConversationEvaluation> {

    const evaluationPrompt = generateEvaluationPrompt(persona, history, objective)

    let completion: any = null
    let lastError: Error | null = null

    for (const modelName of modelNames) {
        try {
            completion = await groq.chat.completions.create({
                model: modelName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "assistant", content: evaluationPrompt },
                    { role: "user", content: lastMessage }
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
        throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown"}`)
    }

    const text = completion.choices?.[0]?.message?.content
    if (!text) throw new Error("LLM returned empty content")
    
    let result: MidConversationEvaluation
    try {
        result = JSON.parse(text) as MidConversationEvaluation
    } catch (err) {
        console.error("Failed to parse LLM response as JSON:", text)
        throw new Error("Failed to parse LLM response as JSON")
    }

    // Clamp rapportChange to [-10, 15]
    if (typeof result.rapportChange === "number") {
        result.rapportChange = Math.min(15, Math.max(-10, result.rapportChange))
    } else {
        result.rapportChange = 0
    }

    // Validate sentiment and expression
    const validSentiments = ["positive", "neutral", "negative"]
    if (!validSentiments.includes(result.sentiment)) result.sentiment = "neutral"

    const validExpressions = ["happy", "neutral", "sad", "angry"]
    if (!validExpressions.includes(result.expression)) result.expression = "neutral"

    // Ensure suggestion is string
    if (typeof result.suggestion !== "string") result.suggestion = "No suggestion available."

    return result
}

function generateEvaluationPrompt(
    persona: FullPersona,
    history: Message[],
    objective: string
): string {

    const conversationText = history.map(msg => {
        const senderLabel = msg.sender === "user" ? "User" : "Persona"
        return `[${msg.sent_at}] ${senderLabel}: ${msg.content}`
    }).join("\n")

    const interests = Array.isArray(persona.interests) ? persona.interests.join(' ') : ""

    const { pid, ...rest } = persona
    const personaText = `
        Name: ${rest.name}
        Age: ${rest.age}
        Personality: ${rest.personality}
        Interests: ${interests}
    `

    return `
        Objective:
        ${objective}

        Profile:
        ${personaText}

        Conversation History:
        ${conversationText}
    `
}
