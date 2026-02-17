"use server"

import Groq from "groq-sdk"
import { type Persona, ScenarioKeys, Prompts, Difficulty, Scenario } from "../types/types"
import { type Database } from '@/supabase/types'
import prompts from '@/lib/prompts.json'
import scenarios from '@/lib/scenarios.json'

type Message = Database['public']['Tables']['messages']['Row']

const apiKey = process.env.GROQ_API_KEY
if (!apiKey) throw new Error("GROQ_API_KEY not set")

const groq = new Groq({ apiKey })

const modelNames = [
    "llama-3.1-8b-instant",      // Fast, smaller model
    "mixtral-8x7b-32768",        // Mixtral model
    "llama-3.3-70b-versatile",   // Newer 70B model (if available)
]

const outputFormat = 
`
    Respond ONLY with a valid JSON object in this exact format:
        {
            "Response": "your response here"
        }
`

const easyMood = "Calm, warm, friendly, forgiving and reassuring."
const hardMood = "Sharp, tense, assertive, quick to anger, slow to forgive and slightly irritable."

const DEFAULT_RESPONSE = "Aiyo... I don't understand leh..."

export async function talkToPersona(
    scenarioName: string,
    difficulty_level: Difficulty,
    personaProfile: Persona,
    conversationHistory: Message[],
    latestUserMessage: string,
    temperature: number = 0.8,
    max_tokens: number = 50
): Promise<string> {

    const conversationalPrompt = generateConversationPrompt(personaProfile, conversationHistory, difficulty_level)
    const systemPrompt = generateSystemPrmopt(scenarioName, difficulty_level)

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
    personaProfile: Persona,
    conversationHistory: Message[],
    difficulty_level: Difficulty,
): string {

    const conversationText = conversationHistory.map(msg => {
        const senderLabel = msg.sender === "user" ? "User" : "Persona"
        return `[${msg.sent_at}] ${senderLabel}: ${msg.content}`
    }).join("\n")
    
    const personaText = `
        Name: ${personaProfile.name}
        Age: ${personaProfile.age}
        Personality: ${personaProfile.personality}
        Interests: ${personaProfile.interests.join(' ')}
        Initial Mood: ${difficulty_level === 'Easy' ? easyMood : hardMood}
    `

    return `
        Profile:
        ${personaText}

        Conversation History:
        ${conversationText}
    `
}

function generateSystemPrmopt(
    scenarioName: string,
    difficulty_level: Difficulty
): string {
    const prompt: Prompts = prompts[scenarioName as ScenarioKeys]
    const conversationalPrompt: Record<string, string[]> = prompt['Conversational_Prompt']

    let result = ''

    Object.entries(conversationalPrompt).forEach(([key, values]) => {
        result += `${key.replaceAll('_', ' ')}\n`

        values.forEach(value => {
            result += `\t${value}\n`
        })

        result += "\n"
    })
    
    result += outputFormat

    // Change <rater> based on difficulty level
    result.replaceAll('<rate>', difficulty_level === "Easy" ? 'monotonic' : 'exponential')

    return result
}
