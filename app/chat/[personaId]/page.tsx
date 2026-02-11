"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Send, Target, AlertCircle, Lightbulb, Activity } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

interface Message {
  id: string
  sender: "user" | "persona"
  text: string
  timestamp: Date
}

type Expression = "happy" | "neutral" | "sad" | "angry"

type ScenarioType = "house-visit" | "emotional-listening" | "resolve-task"

interface ScenarioConfig {
  type: ScenarioType
  name: string
  hint: string
  color: string
  bgColor: string
  difficulty: "Easy" | "Medium" | "Hard"
  maxTurns: number
}

interface EvaluationResult {
  sentiment: "positive" | "neutral" | "negative"
  expression: Expression
  rapportChange: number
  suggestion: string
}

export default function ChatTraining() {
  const params = useParams()
  const router = useRouter()
  const personaId = params.personaId as string
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scenario configuration - in real app, this would come from backend
  const [scenario] = useState<ScenarioConfig>({
    type: "emotional-listening",
    name: "Share a Memory",
    hint: "Validate feelings, don't rush",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    difficulty: "Medium",
    maxTurns: 10,
  })

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
  const [currentTurn, setCurrentTurn] = useState(1)
  const [conversationEnded, setConversationEnded] = useState(false)

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
    if (!inputValue.trim() || conversationEnded) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue,
      timestamp: new Date(),
    }
    setMessages([...messages, userMessage])
    const userMessageText = inputValue
    setInputValue("")

    // Increment turn counter
    const nextTurn = currentTurn + 1
    setCurrentTurn(nextTurn)

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

    // Check if max turns reached
    if (nextTurn >= scenario.maxTurns) {
      setConversationEnded(true)
    }
  }

  const handleEndEarly = () => {
    router.push("/complete")
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

  const turnsRemaining = scenario.maxTurns - currentTurn
  const showTurnWarning = turnsRemaining <= 2 && !conversationEnded

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <Link href="/personas">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Sticky Status Bar - Always visible on mobile */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge className={`${scenario.bgColor} ${scenario.color} border-0 text-xs font-semibold`}>
                {scenario.type === "house-visit" && "🏠 House Visit"}
                {scenario.type === "emotional-listening" && "💙 Emotional"}
                {scenario.type === "resolve-task" && "✅ Task"}
              </Badge>
              <span className="text-sm font-semibold text-gray-900 truncate">{scenario.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium">
                {scenario.difficulty}
              </Badge>
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                Turn {currentTurn} / {scenario.maxTurns}
              </span>
            </div>
          </div>
          
          {/* Compact Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getHealthBarColor()} transition-all duration-500`}
                  style={{ width: `${rapport}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-gray-900 whitespace-nowrap">{rapport}%</span>
          </div>

          {/* Scenario Hint */}
          <p className="text-xs text-gray-600 mt-2 italic">{scenario.hint}</p>

          {/* Turn Warning */}
          {showTurnWarning && (
            <div className="mt-2 flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">
                {turnsRemaining} {turnsRemaining === 1 ? "turn" : "turns"} remaining
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="container mx-auto px-4 py-4 max-w-3xl space-y-3">
          
          {/* Compact HUD: Objective + Current Status */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide">Objective</h4>
                <p className="text-sm text-gray-800 mt-0.5 leading-snug">{objective}</p>
              </div>
            </div>
          </div>

          {/* Avatar - Compact */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex-shrink-0">
              <img
                src={getPortraitUrl(expression) || "/placeholder.svg"}
                alt={personaName}
                className="w-[140px] h-[140px] max-[600px]:w-[120px] max-[600px]:h-[120px] object-cover rounded-lg border-2 border-gray-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">{personaName}</h3>
              <Badge
                variant="secondary"
                className={`mt-1 text-xs capitalize ${
                  expression === "happy"
                    ? "bg-green-100 text-green-700"
                    : expression === "sad"
                      ? "bg-blue-100 text-blue-700"
                      : expression === "angry"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {expression}
              </Badge>
            </div>
          </div>

          {/* Conversation Log */}
          <Card className="bg-white border-gray-200">
            <div className="border-b border-gray-200 px-3 py-2 bg-gray-50">
              <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Conversation</h4>
            </div>

            <div className="p-3 space-y-2.5 min-h-[300px] max-h-[400px] overflow-y-auto" ref={scrollRef}>
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 ${
                      message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
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

          {/* Session Controls */}
          <div className="pt-2">
            {conversationEnded ? (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm font-semibold text-blue-700">Conversation Complete!</p>
                  <p className="text-xs text-gray-600 mt-1">Time to review your performance</p>
                </div>
                <Link href="/complete" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    View Feedback
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                onClick={handleEndEarly}
                variant="outline"
                className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-300 bg-transparent"
              >
                End Session Early
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Coaching Tip Bar - Just above input */}
      {suggestion && !conversationEnded && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide flex-shrink-0">Coach:</span>
              <p className="text-xs text-gray-700 leading-relaxed">{suggestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Bar - Fixed bottom */}
      <div className="border-t border-gray-300 bg-white shadow-lg">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex gap-2">
            <Input
              placeholder={conversationEnded ? "Conversation ended" : "Type your message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              disabled={conversationEnded}
              className="flex-1 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
            />
            <Button
              onClick={handleSend}
              size="icon"
              disabled={conversationEnded}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
