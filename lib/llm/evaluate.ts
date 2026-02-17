"use server"

import Groq from "groq-sdk"
import { MidConversationEvaluation, type Persona, ScenarioKeys, Prompts, Difficulty } from "../types/types"
import { type Database } from '@/supabase/types'
import prompts from '@/lib/prompts.json'

type Message = Database['public']['Tables']['messages']['Row']
type Evaluation = Database['public']['Tables']['evaluations']['Row']

const apiKey = process.env.GROQ_API_KEY
if (!apiKey) throw new Error("GROQ_API_KEY not set")

const groq = new Groq({ apiKey })

const modelNames = [
    "llama-3.1-8b-instant",      // Fast, smaller model
    "mixtral-8x7b-32768",        // Mixtral model
    "llama-3.3-70b-versatile",   // Newer 70B model (if available)
]

const easyMood = "Calm, warm, friendly, forgiving and reassuring."
const hardMood = "Sharp, tense, assertive, quick to anger, slow to forgive and slightly irritable."

const outputFormat = 
`
    Respond ONLY with a valid JSON object in this exact format:
        {
            "sentiment": "positive|neutral|negative",
            "expression": "happy|neutral|sad|angry",
            "rapportChange": <number>,
            "suggestion": "<coaching tip>"
        }
`
export async function evaluateResponse(
    scenarioName: string,
    persona: Persona,
    lastMessage: string,
    history: Message[],
    lastEvaluation: Evaluation | null,
    difficulty_level: Difficulty,
    objective: string,
    temperature = 0.3,
    max_tokens = 200
): Promise<MidConversationEvaluation> {

    const evaluationPrompt = generateEvaluationPrompt(persona, history, objective, lastEvaluation, difficulty_level)
    const systemPrompt = generateSystemPrmopt(scenarioName, difficulty_level)

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
        result.rapportChange = Number(result.rapportChange)
    } catch (err) {
        console.error("Failed to parse LLM response as JSON:", text)
        throw new Error("Failed to parse LLM response as JSON")
    }

    // Clamp rapportChange to depending on difficulty level
    const clamp = difficulty_level === 'Easy' ? 10 : 20
    if (typeof result.rapportChange === "number") {
        result.rapportChange = Math.min(clamp, Math.max(-clamp, result.rapportChange))
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
    persona: Persona,
    history: Message[],
    objective: string,
    evaluation: Evaluation | null,
    difficulty_level: Difficulty
): string {

    const conversationText = history.map(msg => {
        const senderLabel = msg.sender === "user" ? "User" : "Persona"
        return `[${msg.sent_at}] ${senderLabel}: ${msg.content}`
    }).join("\n")

    const interests = Array.isArray(persona.interests) ? persona.interests.join(' ') : ""
    
    const personaText = `
        Name: ${persona.name}
        Age: ${persona.age}
        Personality: ${persona.personality}
        Interests: ${interests}
        Initial Mood: ${difficulty_level === 'Easy' ? easyMood : hardMood}
    `

    const evaluationText = (evaluation ? `
            Sentiment: ${evaluation.sentiment}
            Expression: ${evaluation.expression}
            Rapport: ${evaluation.rapport}
            Suggestion: ${evaluation.suggestion}
        ` : 'None (Brand New Conversation)'
    )

    return `
        Objective:
        ${objective}

        Profile:
        ${personaText}

        Conversation History:
        ${conversationText}

        Last Evaluation:
        ${evaluationText}
    `
}

function generateSystemPrmopt(
    scenarioName: string,
    difficulty_level: Difficulty
): string {
    const prompt: Prompts = prompts[scenarioName as ScenarioKeys]
    const conversationalPrompt: Record<string, string[]> = prompt['Evaluation_Prompt']

    let result = ''

    Object.entries(conversationalPrompt).forEach(([key, values]) => {
        result += `${key.replace('_', ' ')}\n`

        values.forEach(value => {
            result += `\t${value}\n`
        })

        result += "\n"
    })
    
    result += outputFormat

    // Change <score> based on difficulty level
    result.replace('<score>', difficulty_level === "Easy" ? '10' : '20')

    // Change <rater> based on difficulty level
    result.replaceAll('<rate>', difficulty_level === "Easy" ? 'monotonic' : 'exponential')

    return result
}
