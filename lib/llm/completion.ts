import { type EndConversationEvaluation } from '@/lib/types/types'
import { getGroqClient, withShortQuotaRetry } from '@/lib/llm/client'
import { getModelNames, modelOptions, noteRateLimit, outputBudget } from '@/lib/llm/models'
import { transcriptLineIndex } from './transcript'
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
    - "completed" should be true if the exchange reaches a mutually agreed ending, including deferral or quiet company.
    - "objective_met" should be true if the user successfully achieved the intended conversation objective with proper engagement.
    - If the objective was met, identify the numbered volunteer line that addresses a particular detail Margaret shared, and the later Margaret line showing the outcome. Repeated stock questions, a friendly tone or simply saying goodbye do not establish success. A thoughtful close, including granting requested space, may be effective.
    - Judge what both people established across the full visit. If Margaret opens by offering a few minutes, availability is already established. If she asks for space and the visitor grants it, that is meaningful follow-through. Do not recommend pressing her for more conversation. Recognise repairs after an initially clumsy reply.
    - For a house visit, if the volunteer and Margaret agree to leave an object alone and listen together, that IS a concrete action. Do not insist on offering repairs or continuing after she declines help.
    - For feedback, name one concrete exchange accurately. If a criterion is missing, identify that criterion without discounting other steps that did happen.
    - Do not include extra commentary outside the JSON.

  Return format example:
  {
    "completed": true,
    "objective_met": false,
    "volunteerLine": null,
    "margaretLine": null,
    "feedback": "Concise feedback highlighting strengths and areas for improvement",
    "scores": [
      { "name": "Empathy", "value": 0 },
      { "name": "Clarity", "value": 0 },
      { "name": "Conversational Flow", "value": 0 },
      { "name": "Active Listening", "value": 0 }
    ]
  }

  Respect privacy, autonomy and time. Support feedback with specific recorded words or actions.
`

/**
 * Runs end-of-conversation evaluation: completed flag, objective_met, feedback, and metric scores.
 * Tries multiple models; normalises scores to 0–100 integers.
 */
export async function evaluateCompletion(
  conversationHistory: Message[],
  objective: string,
  temperature = 0.3,
  max_tokens = 4096
): Promise<EndConversationEvaluation> {

  const groq = getGroqClient()
  const evaluationPrompt = "Scenario objective: " + objective + "\n" + generateEvaluationPrompt(conversationHistory)

  let completion: any = null
  let lastError: Error | null = null

  for (const modelName of getModelNames()) {
    try {
      completion = await withShortQuotaRetry(modelName, () => groq.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: evaluationPrompt }
        ],
        temperature,
        max_completion_tokens: outputBudget(modelName,max_tokens,420),
        ...modelOptions(modelName,"medium"),
        response_format: { type: "json_object" }
      }))
      const choice = completion.choices[0]
      if (!choice?.message?.content || choice.finish_reason === 'length') {
        throw new Error('LLM returned empty or truncated JSON')
      }
      JSON.parse(choice.message.content)
      break
    } catch (err) {
      completion = null
      noteRateLimit(modelName,err)
            lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Model ${modelName} failed, trying next...`, lastError.message)
    }
  }

  if (!completion) {
    throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown"}`)
  }

  const text = completion.choices?.[0]?.message?.content
  if (!text) throw new Error("LLM returned empty content")

  let result: EndConversationEvaluation & { volunteerLine?: number; margaretLine?: number }
  try {
    result = JSON.parse(text) as EndConversationEvaluation
  } catch (err) {
    console.error("Failed to parse LLM response as JSON:", text)
    throw new Error("Failed to parse LLM response as JSON")
  }

  if (typeof result.feedback !== "string") result.feedback = ""
  // Ensure scores are integers between 0-100
  if (Array.isArray(result.scores)) {
    result.scores = result.scores.filter(score => score && typeof score.name === "string" &&
      score.name.trim() && typeof score.value === "number" && Number.isFinite(score.value)).map(score => ({
      name: score.name,
      value: Math.min(100, Math.max(0, Math.round(score.value ?? 0)))
    }))
  } else {
    result.scores = []
  }

  const volunteer = transcriptLineIndex(result.volunteerLine)
  const margaret = transcriptLineIndex(result.margaretLine)
  result.objective_met = result.objective_met === true && margaret > volunteer &&
    conversationHistory[volunteer]?.sender === "user" && conversationHistory[margaret]?.sender === "persona"
  return result
}

/** Formats conversation history as text for the completion evaluation prompt. */
function generateEvaluationPrompt(conversationHistory: Message[]): string {
  return JSON.stringify(conversationHistory.map((msg, index) => ({
    line: index + 1,
    speaker: msg.sender === "user" ? "Volunteer" : "Margaret",
    words: msg.content,
  })))
}
