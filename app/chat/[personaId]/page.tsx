"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Send, Lightbulb, Activity } from "lucide-react"
import { useParams } from "next/navigation"

interface Message {
  id: string
  sender: "user" | "persona"
  text: string
  timestamp: Date
}

type Expression = "happy" | "neutral" | "sad" | "angry"

interface EvaluationResult {
  sentiment: "positive" | "neutral" | "negative"
  expression: Expression
  rapportChange: number
  suggestion: string
}

export default function ChatTraining() {
  const params = useParams()
  const personaId = params.personaId as string
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "persona",
      text: "Hello dear! It's so nice to have someone to talk to. How are you doing today?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [rapport, setRapport] = useState(50)
  const [expression, setExpression] = useState<Expression>("neutral")
  const [objective] = useState("Get the senior to talk about how they met their spouse")
  const [suggestion, setSuggestion] = useState("Try asking about their day or showing interest in their well-being")
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null)

  const personaName = personaId === "margaret" ? "Margaret Thompson" : "Robert Chen"

  const getPortraitUrl = (expr: Expression) => {
    const baseQuery =
      personaId === "margaret"
        ? "elderly grandmother woman smiling portrait RPG game character art"
        : "elderly grandfather man portrait RPG game character art"

    const expressionQuery =
      expr === "happy"
        ? "smiling happy"
        : expr === "sad"
          ? "sad concerned"
          : expr === "angry"
            ? "stern upset"
            : "neutral calm"

    return `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(`${baseQuery} ${expressionQuery}`)}`
  }

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessageToPersona(userMessage: string): Promise<string> {
    // TODO: Replace with actual API call to backend Primary AI
    console.log("[v0] sendMessageToPersona called with:", userMessage)

    // Simulated responses for now
    const responses = [
      "That's very thoughtful of you to ask! You know, that reminds me of when I first met my dear spouse at a community dance.",
      "Oh, I appreciate your interest. Not many young people take the time to listen these days. My late spouse was just like you.",
      "Well, let me tell you a story about that. It was back in 1965, and I had just moved to the city...",
      "You're very kind. My spouse and I met at the library, would you believe it? We both reached for the same book!",
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  async function evaluateConversation(userMessage: string, personaResponse: string): Promise<EvaluationResult> {
    // TODO: Replace with actual API call to backend Secondary AI (evaluator)
    console.log("[v0] evaluateConversation called with:", { userMessage, personaResponse })

    // Simulated evaluation for now
    const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "neutral", "negative"]
    const expressions: Expression[] = ["happy", "neutral", "sad", "angry"]
    const suggestions = [
      "Great! Try asking a follow-up question about their spouse or relationship",
      "Show empathy by acknowledging their feelings and memories",
      "Consider asking about specific details like where they met or what attracted them",
      "Express interest in their story - try saying 'That sounds wonderful, please tell me more'",
      "Try to be more specific with your questions to engage them better",
      "Show genuine curiosity about their experiences",
    ]

    const rapportChange = Math.floor(Math.random() * 20) - 5 // -5 to +15

    return {
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      expression: expressions[Math.floor(Math.random() * expressions.length)],
      rapportChange,
      suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
    }
  }

  function updateHealthBar(change: number) {
    // TODO: Could add more sophisticated logic here
    console.log("[v0] updateHealthBar called with change:", change)

    setRapport((prev) => {
      const newRapport = Math.min(Math.max(prev + change, 0), 100)
      return newRapport
    })
  }

  function updateAvatarExpression(newExpression: Expression) {
    // TODO: Could add animation or transition logic here
    console.log("[v0] updateAvatarExpression called with:", newExpression)

    setExpression(newExpression)
  }

  function showSystemSuggestions(newSuggestion: string) {
    // TODO: Could add notification or highlight animation here
    console.log("[v0] showSystemSuggestions called with:", newSuggestion)

    setSuggestion(newSuggestion)
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue,
      timestamp: new Date(),
    }
    setMessages([...messages, userMessage])
    const userMessageText = inputValue
    setInputValue("")

    // Call Primary AI to get persona response
    const personaResponseText = await sendMessageToPersona(userMessageText)

    const personaMessage: Message = {
      id: (Date.now() + 1).toString(),
      sender: "persona",
      text: personaResponseText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, personaMessage])

    // Call Secondary AI to evaluate the conversation
    const evaluation = await evaluateConversation(userMessageText, personaResponseText)

    // Store evaluation for display
    setLastEvaluation(evaluation)

    // Update UI based on evaluation results
    updateHealthBar(evaluation.rapportChange)
    updateAvatarExpression(evaluation.expression)
    showSystemSuggestions(evaluation.suggestion)
  }

  const getHealthBarColor = () => {
    if (rapport >= 70) return "bg-emerald-500"
    if (rapport >= 40) return "bg-amber-500"
    return "bg-rose-500"
  }

  const getSentimentColor = (sentiment: "positive" | "neutral" | "negative") => {
    if (sentiment === "positive") return "text-emerald-600"
    if (sentiment === "negative") return "text-rose-600"
    return "text-gray-600"
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-32">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <Link href="/personas">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Personas
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-3xl space-y-4">
        {/* 1. Objective */}
        <Card className="bg-blue-50 border-blue-200 p-4">
          <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2 mb-1">🎯 Objective</h4>
          <p className="text-gray-700 text-sm leading-relaxed">{objective}</p>
        </Card>

        {/* 2. Rapport */}
        <Card className="bg-white border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="font-bold text-gray-800 text-sm">Rapport Level</h4>
            <span className="text-gray-900 font-bold text-lg">{rapport}%</span>
          </div>
          <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
            <div
              className={`absolute inset-y-0 left-0 ${getHealthBarColor()} transition-all duration-500 rounded-full`}
              style={{ width: `${rapport}%` }}
            />
          </div>
        </Card>

        {/* 3. Avatar */}
        <Card className="bg-white border-gray-200 p-4 flex items-center gap-4">
          <div className="flex-shrink-0">
            <img
              src={getPortraitUrl(expression) || "/placeholder.svg"}
              alt={personaName}
              className="w-[150px] h-[150px] max-[600px]:w-[120px] max-[600px]:h-[120px] object-cover rounded-full border-4 border-gray-300"
              style={{ flex: "0 0 auto" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900">{personaName}</h3>
          </div>
        </Card>

        {/* 4. Convo Tips / Suggestions */}
        <Card className="bg-amber-50 border-amber-200 p-4">
          <h4 className="font-bold text-amber-700 text-sm flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4" /> Conversation Tip
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">{suggestion}</p>
        </Card>

        {lastEvaluation && (
          <Card className="bg-purple-50 border-purple-200 p-3">
            <h4 className="font-bold text-purple-700 text-xs flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5" /> AI Evaluation
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-600 font-medium">Sentiment:</span>
                <p className={`font-bold capitalize ${getSentimentColor(lastEvaluation.sentiment)}`}>
                  {lastEvaluation.sentiment}
                </p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Expression:</span>
                <p className="font-bold text-purple-700 capitalize">{lastEvaluation.expression}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Rapport:</span>
                <p className={`font-bold ${lastEvaluation.rapportChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {lastEvaluation.rapportChange >= 0 ? "+" : ""}
                  {lastEvaluation.rapportChange}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 5. Convo Log */}
        <Card className="bg-white border-gray-200 flex flex-col h-[400px]">
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <h4 className="font-bold text-gray-800 text-sm">Conversation Log</h4>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p className="leading-relaxed text-sm">{message.text}</p>
                  <span
                    className={`text-xs mt-1 block ${message.sender === "user" ? "text-blue-100" : "text-gray-500"}`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 6. End Training Button */}
        <Link href="/complete" className="block">
          <Button className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-semibold py-3.5 rounded-lg shadow-md">
            End Training Session
          </Button>
        </Link>
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-300 bg-white shadow-lg p-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
            />
            <Button onClick={handleSend} size="icon" className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
