"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Send, AlertCircle, Lightbulb } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string
  sender: "user" | "persona"
  text: string
  timestamp: Date
  /** Coaching tip surfaced by the Secondary AI after this user message */
  coachTip?: string
}

type Expression = "happy" | "neutral" | "sad" | "angry"

type ScenarioType = "house-visit" | "listening-ear" | "resolve-task"

/** Controls where the AI coaching suggestion is shown */
type GuidanceMode = "inline" | "bottom-bar"

interface ScenarioConfig {
  type: ScenarioType
  label: string
  objective: string
  guidance: string[]
  color: string
  bgColor: string
}

interface EvaluationResult {
  sentiment: "positive" | "neutral" | "negative"
  expression: Expression
  rapportChange: number
  suggestion: string
}

/* ------------------------------------------------------------------ */
/*  Scenario definitions (aligned with /personas page ids)             */
/* ------------------------------------------------------------------ */

const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  "house-visit": {
    type: "house-visit",
    label: "House Visit",
    objective: "Complete a polite and efficient home visit with the senior.",
    guidance: [
      "Keep conversation short and polite",
      "Ask clear, practical questions",
      "Stay focused on the purpose of the visit",
    ],
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  "listening-ear": {
    type: "listening-ear",
    label: "Listening Ear",
    objective: "Help the senior feel heard and emotionally supported.",
    guidance: [
      "Encourage sharing",
      "Validate emotions",
      "Do not interrupt",
      "Avoid solving unless asked",
    ],
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  "resolve-task": {
    type: "resolve-task",
    label: "Resolve a Task",
    objective: "Help the senior complete a specific task successfully.",
    guidance: [
      "Explain steps clearly and slowly",
      "Break tasks into simple parts",
      "Check understanding frequently",
      "Be patient and reassuring",
    ],
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatTraining() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const personaId = params.personaId as string

  // Determine scenario from URL query, fallback to listening-ear
  const scenarioParam = (searchParams.get("scenario") ?? "listening-ear") as ScenarioType
  const scenario = SCENARIOS[scenarioParam] ?? SCENARIOS["listening-ear"]

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null)

  // -----------------------------------------------------------
  //  Guidance mode: "inline" = tips under each user bubble,
  //                 "bottom-bar" = persistent bar above input.
  //  Change this single value to switch between the two modes.
  // -----------------------------------------------------------
  const guidanceMode: GuidanceMode = "bottom-bar"

  // Difficulty & turn limits
  const [difficulty, setDifficulty] = useState<"Easy" | "Hard">("Easy")
  const maxTurns = difficulty === "Hard" ? 8 : 10

  // Conversation state
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
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null)
  const [currentTurn, setCurrentTurn] = useState(1)
  const [conversationEnded, setConversationEnded] = useState(false)

  const personaName = "Margaret Chan"

  /* ---------------------------------------------------------------- */
  /*  Auto-scroll on new messages                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM has updated before scrolling
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    }
  }, [messages])

  /* ---------------------------------------------------------------- */
  /*  Primary AI: persona response (placeholder)                       */
  /* ---------------------------------------------------------------- */

  async function sendMessageToPersona(userMessage: string): Promise<string> {
    const responses = [
      "That's very thoughtful of you to ask! You know, that reminds me of when I first met my dear spouse at a community dance.",
      "Oh, I appreciate your interest. Not many young people take the time to listen these days. My late spouse was just like you.",
      "Well, let me tell you a story about that. It was back in 1965, and I had just moved to the city...",
      "You're very kind. My spouse and I met at the library, would you believe it? We both reached for the same book!",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /* ---------------------------------------------------------------- */
  /*  Secondary AI: evaluation (placeholder)                           */
  /* ---------------------------------------------------------------- */

  async function evaluateConversation(
    userMessage: string,
    personaResponse: string,
  ): Promise<EvaluationResult> {
    const sentiments: ("positive" | "neutral" | "negative")[] = [
      "positive",
      "neutral",
      "negative",
    ]
    const expressions: Expression[] = ["happy", "neutral", "sad", "angry"]
    const suggestions = [
      "Great! Try asking a follow-up question about their story",
      "Show empathy by acknowledging their feelings",
      "Consider asking about specific details to keep them engaged",
      "Express interest - try saying 'That sounds wonderful, please tell me more'",
      "Try to be more specific with your questions",
      "Show genuine curiosity about their experiences",
    ]
    const rapportChange = Math.floor(Math.random() * 20) - 5

    return {
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      expression: expressions[Math.floor(Math.random() * expressions.length)],
      rapportChange,
      suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
    }
  }

  /* ---------------------------------------------------------------- */
  /*  UI update helpers                                                */
  /* ---------------------------------------------------------------- */

  function updateHealthBar(change: number) {
    setRapport((prev) => Math.min(Math.max(prev + change, 0), 100))
  }

  function updateAvatarExpression(newExpression: Expression) {
    setExpression(newExpression)
  }

  function showSystemSuggestions(newSuggestion: string) {
    setLastEvaluation(
      (prev) => ({ ...prev, suggestion: newSuggestion }) as EvaluationResult,
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Send handler                                                     */
  /* ---------------------------------------------------------------- */

  const handleSend = async () => {
    if (!inputValue.trim() || conversationEnded) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    const userMessageText = inputValue
    setInputValue("")

    const nextTurn = currentTurn + 1
    setCurrentTurn(nextTurn)

    // Primary AI
    const personaResponseText = await sendMessageToPersona(userMessageText)
    const personaMessage: Message = {
      id: (Date.now() + 1).toString(),
      sender: "persona",
      text: personaResponseText,
      timestamp: new Date(),
    }

    // Secondary AI
    const evaluation = await evaluateConversation(userMessageText, personaResponseText)
    setLastEvaluation(evaluation)
    updateHealthBar(evaluation.rapportChange)
    updateAvatarExpression(evaluation.expression)
    showSystemSuggestions(evaluation.suggestion)

    // Attach the coaching tip to the user message (used in "inline" mode)
    setMessages((prev) => {
      const updated = [...prev]
      const lastUserIdx = updated.findLastIndex((m) => m.sender === "user")
      if (lastUserIdx !== -1) {
        updated[lastUserIdx] = { ...updated[lastUserIdx], coachTip: evaluation.suggestion }
      }
      return [...updated, personaMessage]
    })

    if (nextTurn >= maxTurns) setConversationEnded(true)
  }

  const handleEndEarly = () => {
    router.push("/complete")
  }

  const handleDifficultyChange = (value: "Easy" | "Hard") => {
    setDifficulty(value)
  }

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const getHealthBarColor = () => {
    if (rapport >= 70) return "bg-emerald-500"
    if (rapport >= 40) return "bg-amber-500"
    return "bg-rose-500"
  }

  const expressionBorder = () => {
    switch (expression) {
      case "happy":
        return "border-green-400"
      case "sad":
        return "border-blue-400"
      case "angry":
        return "border-red-400"
      default:
        return "border-gray-300"
    }
  }

  const expressionBadge = () => {
    switch (expression) {
      case "happy":
        return "bg-green-100 text-green-700"
      case "sad":
        return "bg-blue-100 text-blue-700"
      case "angry":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const turnsRemaining = maxTurns - currentTurn
  const showTurnWarning = turnsRemaining <= 2 && !conversationEnded

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="h-dvh flex flex-col bg-[#F5F6F8]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/personas">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-gray-600 hover:text-gray-900 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <span className="text-sm font-bold text-gray-900">{scenario.label}</span>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={difficulty}
              onValueChange={handleDifficultyChange}
            >
              <SelectTrigger className="h-7 w-[72px] text-xs border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy" className="text-xs">Easy</SelectItem>
                <SelectItem value="Hard" className="text-xs">Hard</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs font-bold text-gray-600 tabular-nums">
              {currentTurn}/{maxTurns}
            </span>
          </div>
        </div>

        {/* Rapport bar */}
        <div className="max-w-3xl mx-auto mt-2 flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-600">Rapport</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getHealthBarColor()} transition-all duration-500`}
              style={{ width: `${rapport}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-900 tabular-nums w-8 text-right">
            {rapport}%
          </span>
        </div>

        {/* Turn warning */}
        {showTurnWarning && (
          <div className="max-w-3xl mx-auto mt-2 flex items-center gap-2 text-amber-800 bg-amber-100 px-3 py-1.5 rounded">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium">
              {turnsRemaining} {turnsRemaining === 1 ? "turn" : "turns"} remaining
            </span>
          </div>
        )}
      </header>

      {/* ── Chat Card (fills remaining space) ──────────────────── */}
      <Card className="flex-1 flex flex-col mx-3 my-3 max-w-3xl w-full self-center overflow-hidden border-gray-200">
        {/* Fixed top: Full-width avatar + name overlay + objective */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          {/* Full-width avatar banner */}
          <div className="relative w-full">
            <img
              src="/elderly-woman-cartoon-avatar-smiling-grandmother.jpg"
              alt={personaName}
              className={`w-full h-56 sm:h-64 object-cover border-b-4 ${expressionBorder()} transition-colors duration-300`}
            />
            {/* Name + expression overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
              <div className="flex items-end justify-between">
                <h3 className="text-base font-bold text-white drop-shadow-sm">{personaName}</h3>
                <Badge variant="secondary" className={`text-xs capitalize ${expressionBadge()}`}>
                  {expression}
                </Badge>
              </div>
            </div>
          </div>

          {/* Objective */}
          <div className="px-3 py-1">
            <div className={`${scenario.bgColor} border rounded-lg px-2.5 py-1`}>
              <h4 className={`text-[10px] font-bold ${scenario.color} uppercase tracking-wide mb-0.5`}>
                Objective
              </h4>
              <p className="text-xs text-gray-800 leading-tight">{scenario.objective}</p>
            </div>
          </div>

          {/* Coaching tip - fixed below objective */}
          {lastEvaluation && !conversationEnded && (
            <div className="px-3 pb-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  {lastEvaluation.suggestion}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable message log */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-[300px] overflow-y-auto px-4 pt-3 pb-20 space-y-3 bg-gray-50"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}
            >
              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                  message.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <p className="text-xs leading-relaxed">{message.text}</p>
                <span
                  className={`text-xs mt-1 block ${
                    message.sender === "user" ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>


            </div>
          ))}
        </div>
      </Card>

      {/* ── Bottom controls ────────────────────────────────────── */}

      {/* Guidance + End session / View results */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-3xl mx-auto space-y-2">
          {conversationEnded ? (
            <Link href="/complete">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 text-sm">
                View Results
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleEndEarly}
              variant="outline"
              size="sm"
              className="w-full text-gray-500 hover:text-gray-900 border-gray-300 bg-transparent h-8 text-xs"
            >
              End Session Early
            </Button>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-300 shadow-lg px-4 py-2.5">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            placeholder={conversationEnded ? "Session ended" : "Type your message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
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
