import Groq from "groq-sdk"
import { NextRequest, NextResponse } from "next/server"

const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY

if (!apiKey) {
  console.error("NEXT_PUBLIC_GROQ_API_KEY is not set")
}

const groq = apiKey ? new Groq({ apiKey }) : null

export async function POST(request: NextRequest) {
  try {
    if (!groq || !apiKey) {
      return NextResponse.json(
        { error: "API key not configured. Please set NEXT_PUBLIC_GROQ_API_KEY environment variable." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { userMessage, personaResponse, objective } = body

    if (!userMessage || !personaResponse) {
      return NextResponse.json({ error: "userMessage and personaResponse are required" }, { status: 400 })
    }

    const evaluationPrompt = `You are an expert conversation coach evaluating a conversation between a user and a senior persona. Analyze the user's message and the persona's response.

User's message: "${userMessage}"
Persona's response: "${personaResponse}"
${objective ? `Training objective: "${objective}"` : ""}

Evaluate the conversation and provide:
1. Sentiment: "positive", "neutral", or "negative" - based on how the user's message would make the senior feel
2. Expression: "happy", "neutral", "sad", or "angry" - the emotional expression the senior would show
3. Rapport change: a number between -10 and +15 indicating how much the rapport improved or worsened
4. Suggestion: a helpful coaching tip (1-2 sentences) for the user to improve their conversation skills

Respond ONLY with a valid JSON object in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "expression": "happy|neutral|sad|angry",
  "rapportChange": <number>,
  "suggestion": "<coaching tip>"
}`

    // Try multiple models in case one is unavailable
    const modelNames = [
      "llama-3.1-8b-instant",      // Fast, smaller model
      "mixtral-8x7b-32768",        // Mixtral model
      "llama-3.3-70b-versatile",   // Newer 70B model (if available)
    ]

    let completion
    let lastError: Error | null = null

    for (const modelName of modelNames) {
      try {
        completion = await groq.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "system",
              content: "You are an expert conversation coach. Always respond with valid JSON only, no additional text.",
            },
            { role: "user", content: evaluationPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent evaluation
          max_tokens: 200,
          response_format: { type: "json_object" }, // Force JSON response
        })
        break // Success, exit loop
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.log(`Evaluation model ${modelName} failed, trying next...`)
        continue
      }
    }

    if (!completion) {
      throw new Error(`All evaluation models failed. Last error: ${lastError?.message || "Unknown error"}`)
    }

    const text = completion.choices[0]?.message?.content || "{}"

    // Parse JSON response
    let evaluation
    try {
      evaluation = JSON.parse(text)
    } catch (parseError) {
      // Try to extract JSON if wrapped in text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Could not parse JSON from AI response")
      }
    }

    // Validate and normalize the response
    const validSentiments = ["positive", "neutral", "negative"]
    const validExpressions = ["happy", "neutral", "sad", "angry"]

    if (!validSentiments.includes(evaluation.sentiment)) {
      evaluation.sentiment = "neutral"
    }
    if (!validExpressions.includes(evaluation.expression)) {
      evaluation.expression = "neutral"
    }
    if (typeof evaluation.rapportChange !== "number") {
      evaluation.rapportChange = 0
    } else {
      evaluation.rapportChange = Math.max(-10, Math.min(15, Math.round(evaluation.rapportChange)))
    }
    if (!evaluation.suggestion || typeof evaluation.suggestion !== "string") {
      evaluation.suggestion = "Continue showing genuine interest and empathy in the conversation."
    }

    return NextResponse.json(evaluation)
  } catch (error) {
    console.error("Error evaluating conversation:", error)
    // Return a default evaluation on error
    return NextResponse.json(
      {
        sentiment: "neutral",
        expression: "neutral",
        rapportChange: 0,
        suggestion: "Continue showing genuine interest and empathy in the conversation.",
      },
      { status: 200 }
    )
  }
}

