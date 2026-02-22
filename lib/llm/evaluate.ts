"use server"

import Groq from "groq-sdk"
import { MidConversationEvaluation, type Persona, ScenarioKeys, Prompts, Difficulty, Scenario } from "../types/types"
import { type Database } from '@/supabase/types'
import prompts from '@/lib/prompts.json'
import scenarios from '@/lib/scenarios.json'

type Message = Database['public']['Tables']['messages']['Row']
type Evaluation = Database['public']['Tables']['evaluations']['Row']
type Expression = Database['public']['Enums']['eval_new_expression']

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
            "expression": "<expression_range>",
            "rapportChange": <number>,
            "suggestion": "<coaching tip>",
            "feedback": "<latest message feedback>",
            "status": "good|normal|needs improvement"
        }
`

const taskOutputFormat =
`
    Respond ONLY with a valid JSON object in this exact format:
        {
            "sentiment": "positive|neutral|negative",
            "expression": "<expression_range>",
            "rapportChange": <number>,
            "suggestion": "<coaching tip>",
            "feedback": "<latest message feedback>",
            "status": "good|normal|needs improvement",
            "taskCompleted": true|false
        }
`

/**
 * Evaluates the user's latest message: sentiment, expression, rapport change, and coaching suggestion.
 * Tries multiple models; clamps and validates the JSON response.
 */
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

    const scenario: Scenario = scenarios[scenarioName as ScenarioKeys]

    const evaluationPrompt = generateEvaluationPrompt(persona, history, objective, lastEvaluation, difficulty_level)
    const systemPrompt = generateSystemPrompt(scenarioName, difficulty_level)

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
    const clamp = difficulty_level === 'Easy' ? 5 : 10
    if (typeof result.rapportChange === "number") {
        result.rapportChange = Math.min(clamp, Math.max(-clamp, Math.round(result.rapportChange / clamp) * clamp))
    } else {
        result.rapportChange = 0
    }

    // Validate sentiment and expression
    const validSentiments = ["positive", "neutral", "negative"]
    if (!validSentiments.includes(result.sentiment)) result.sentiment = "neutral"

    const validExpressions = scenario.constraints.approved_expressions
    if (!validExpressions.includes(result.expression)) result.expression = scenario.constraints.default_expression as Expression

    // Ensure suggestion is string
    if (typeof result.suggestion !== "string") result.suggestion = "No suggestion available."

    // Validate taskCompleted for task-based scenarios
    if (scenarioName === 'Resolve a Task') {
        result.taskCompleted = result.taskCompleted === true || result.taskCompleted === 'true' as any
    }

    return result
}

/** Builds the prompt for mid-conversation evaluation (objective, persona, history, last evaluation). */
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
        Gender: ${persona.gender}
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

/** Builds the system prompt for mid-conversation evaluation from scenario prompts and difficulty. */
function generateSystemPrompt(
    scenarioName: string,
    difficulty_level: Difficulty
): string {
    const scenario: Scenario = scenarios[scenarioName as ScenarioKeys]
    const prompt: Prompts = prompts[scenarioName as ScenarioKeys]
    const conversationalPrompt: Record<string, string[]> = prompt['Evaluation_Prompt']

    let result = ''

    Object.entries(conversationalPrompt).forEach(([key, values]) => {
        result += `${key.replaceAll('_', ' ')}\n`

        values.forEach(value => {
            result += `\t${value}\n`
        })

        result += '\n'
    })

    const expression_range = scenario.constraints.approved_expressions.join('|')
    const chosen_output_format = scenarioName === 'Resolve a Task' ? taskOutputFormat : outputFormat
    const output_format_with_expression = chosen_output_format.replaceAll('<expression_range>', expression_range)
    
    result += output_format_with_expression
    result = result.replaceAll('<score>', difficulty_level === 'Easy' ? '5' : '10')

    return result
}
