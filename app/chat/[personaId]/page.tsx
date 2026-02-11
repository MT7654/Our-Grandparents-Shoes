"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  difficulty: "Easy" | "Hard"
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
  const [scenario, setScenario] = useState<ScenarioConfig>({
    type: "emotional-listening",
    name: "Empathy",
    hint: "Validate feelings, don't rush",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    difficulty: "Easy",
    maxTurns: 10,
  })

  const [difficulty, setDifficulty] = useState<"Easy" | "Hard">("Easy")

  const handleDifficultyChange = (value: "Easy" | "Hard") => {
    setDifficulty(value)
    setScenario((prev) => ({
      ...prev,
      difficulty: value,
      // Adjust maxTurns based on difficulty
      maxTurns: value === "Hard" ? 8 : 10,
    }))
  }

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
  const [objective] = useState("Lend a listening ear to the senior's problems")
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
    <div className="h-screen flex flex-col bg-[#F5F6F8]">
      {/* Persistent Training HUD - Always Visible */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-300 shadow-md">
        <div className="px-3 py-2">
          {/* Row 1: Scenario Info + Turn Counter */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Link href="/personas">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-600 hover:text-gray-900 bg-transparent">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Badge className={`${scenario.bgColor} ${scenario.color} border-0 text-xs px-2 py-0.5`}>
                {scenario.type === "house-visit" && "House Visit"}
                {scenario.type === "emotional-listening" && "Emotional"}
                {scenario.type === "resolve-task" && "Task"}
              </Badge>
              <span className="text-xs font-bold text-gray-900 truncate">{scenario.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={difficulty} onValueChange={handleDifficultyChange} disabled={currentTurn > 1}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy" className="text-xs">
                    Easy
                  </SelectItem>
                  <SelectItem value="Hard" className="text-xs">
                    Hard
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs font-bold text-gray-700">
                {currentTurn}/{scenario.maxTurns}
              </span>
            </div>
          </div>

          {/* Row 2: Rapport Bar with Avatar Integration */}
          <div className="flex items-center gap-3">
            {/* Compact Avatar with Expression Indicator */}
            <div className="relative flex-shrink-0">
              <img
                src={getPortraitUrl(expression) || "/placeholder.svg"}
                alt={personaName}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
              />
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  expression === "happy"
                    ? "bg-green-500"
                    : expression === "sad"
                      ? "bg-blue-500"
                      : expression === "angry"
                        ? "bg-red-500"
                        : "bg-gray-400"
                }`}
                title={expression}
              />
            </div>

            {/* Rapport Progress Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">Rapport</span>
                <span className="text-xs font-bold text-gray-900">{rapport}%</span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getHealthBarColor()} transition-all duration-500`}
                  style={{ width: `${rapport}%` }}
                />
              </div>
            </div>
          </div>

          {/* Row 3: Turn Warning (conditional) */}
          {showTurnWarning && (
            <div className="mt-2 flex items-center gap-2 text-amber-800 bg-amber-100 px-2 py-1.5 rounded">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">
                {turnsRemaining} {turnsRemaining === 1 ? "turn" : "turns"} left
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Conversation Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-3 space-y-3 max-w-3xl mx-auto">
          {/* Objective Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-0.5">Goal</h4>
                <p className="text-sm text-gray-800 leading-snug">{objective}</p>
              </div>
            </div>
          </div>

          {/* Conversation Log */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Conversation</h4>
            </div>
            <div className="p-3 space-y-2 min-h-[250px]" ref={scrollRef}>
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <span className={`text-xs mt-1 block ${message.sender === "user" ? "text-blue-100" : "text-gray-500"}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* End Session Control */}
          {conversationEnded && (
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-sm font-semibold text-blue-700">Session Complete</p>
                <p className="text-xs text-gray-600 mt-0.5">Review your performance</p>
              </div>
              <Link href="/complete">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">View Results</Button>
              </Link>
            </div>
          )}
          {!conversationEnded && (
            <Button
              onClick={handleEndEarly}
              variant="outline"
              size="sm"
              className="w-full text-gray-600 hover:text-gray-900 border-gray-300 bg-transparent"
            >
              End Session Early
            </Button>
          )}

          {/* Bottom spacing for coaching bar + input */}
          <div className="h-28" />
        </div>
      </div>

      {/* Coaching Bar - Sticky Above Input */}
      {suggestion && !conversationEnded && (
        <div className="sticky bottom-16 z-10 bg-amber-50 border-t border-amber-200 px-3 py-2 shadow-sm">
          <div className="flex items-start gap-2 max-w-3xl mx-auto">
            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Coach</span>
              <p className="text-xs text-gray-800 leading-relaxed mt-0.5">{suggestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Bar - Fixed Bottom */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-300 shadow-lg px-3 py-2.5">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            placeholder={conversationEnded ? "Session ended" : "Type your message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={conversationEnded}
            className="flex-1 h-10 text-sm bg-gray-50 border-gray-300 disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={conversationEnded}
            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
