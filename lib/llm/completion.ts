import { type EndConversationEvaluation } from '@/lib/types/types'
import { getGroqClient } from '@/lib/llm/client'
import { getModelNames } from '@/lib/llm/models'
import { type Database } from '@/supabase/types'

type Message = Database['public']['Tables']['messages']['Row']


const systemPrompt = `
  You are an expert conversation coach evaluating a conversation between a user and a senior persona. 
  Analyze the conversation carefully and provide feedback in JSON format.

  Rules:
    - Scores must be integers between 0 and 100.
    - JSON must be valid.
    - Provide concise feedback.
    - Focus on evaluating the conversation based on:
        1. User's participation and engagement (Did they attempt a structured conversation flow with multiple meaningful prompts and follow-ups?).
        2. Dialogue flow and success in achieving the conversation objective (Did they guide the conversation effectively toward the intended goal with empathy, clarity, and active listening?).
    - "completed" should be true if the user attempted a structured conversation flow with at least 3 follow-ups.
    - "objective_met" should be true if the user successfully achieved the intended conversation objective with proper engagement.
    - Do not include extra commentary outside the JSON.

  Return format example:
  {
    "completed": true,
    "objective_met": true,
    "feedback": "Concise feedback highlighting strengths and areas for improvement",
    "scores": [
      { "name": "Empathy", "value": 0 },
      { "name": "Clarity", "value": 0 },
      { "name": "Conversational Flow", "value": 0 },
      { "name": "Active Listening", "value": 0 }
    ]
  }

  Remember only return "completed" as true if there are at least 3 follow ups by the user.
`

/**
 * Runs end-of-conversation evaluation: completed flag, objective_met, feedback, and metric scores.
 * Tries multiple models; normalises scores to 0–100 integers.
 */
export async function evaluateCompletion(
  conversationHistory: Message[],
  temperature = 0.3,
  max_tokens = 2048
): Promise<EndConversationEvaluation> {

  const groq = getGroqClient()
  const evaluationPrompt = generateEvaluationPrompt(conversationHistory)

  let completion: any = null
  let lastError: Error | null = null

  for (const modelName of getModelNames()) {
    try {
      completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: evaluationPrompt }
        ],
        temperature,
        max_completion_tokens: max_tokens,
        reasoning_effort: 'low',
        include_reasoning: false,
        response_format: { type: "json_object" }
      })
      const choice = completion.choices[0]
      if (!choice?.message?.content || choice.finish_reason === 'length') {
        throw new Error('LLM returned empty or truncated JSON')
      }
      JSON.parse(choice.message.content)
      break
    } catch (err) {
      completion = null
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Model ${modelName} failed, trying next...`, lastError.message)
    }
  }

  if (!completion) {
    throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown"}`)
  }

  const text = completion.choices?.[0]?.message?.content
  if (!text) throw new Error("LLM returned empty content")

  let result: EndConversationEvaluation
  try {
    result = JSON.parse(text) as EndConversationEvaluation
  } catch (err) {
    console.error("Failed to parse LLM response as JSON:", text)
    throw new Error("Failed to parse LLM response as JSON")
  }

  // Ensure scores are integers between 0-100
  if (Array.isArray(result.scores)) {
    result.scores = result.scores.map(score => ({
      name: score.name,
      value: Math.min(100, Math.max(0, Math.round(score.value ?? 0)))
    }))
  } else {
    // Fallback if scores missing
    result.scores = [
      { name: "empathy", value: 0 },
      { name: "clarity", value: 0 },
      { name: "conversationFlow", value: 0 },
      { name: "activeListening", value: 0 }
    ]
  }

  return result
}

/** Formats conversation history as text for the completion evaluation prompt. */
function generateEvaluationPrompt(conversationHistory: Message[]): string {
  const conversationText = conversationHistory.map(msg => {
    const senderLabel = msg.sender === "user" ? "User" : "Persona"
    return `[${msg.sent_at}] ${senderLabel}: ${msg.content}`
  }).join("\n")

  return `Conversation History:\n${conversationText}`
}
