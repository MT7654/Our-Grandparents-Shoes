"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Send, AlertCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

interface Message {
  id: string
  sender: "user" | "persona"
  text: string
  timestamp: Date
}

type Expression = "happy" | "neutral" | "sad" | "angry"
type ScenarioType = "house-visit" | "listening-ear" | "resolve-task"

interface ScenarioConfig {
  type: ScenarioType
  name: string
  goal: string
  focusAreas: string[]
  guidance: string[]
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

const SCENARIO_CONFIGS: Record<ScenarioType, Omit<ScenarioConfig, "difficulty" | "maxTurns">> = {
  "house-visit": {
    type: "house-visit",
    name: "House Visit",
    goal: "Complete a polite and efficient visit with the senior.",
    focusAreas: ["Clear communication", "Staying on topic", "Respecting time"],
    guidance: ["Keep conversation short and polite", "Ask clear, practical questions", "Stay focused on the purpose of the visit"],
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  "listening-ear": {
    type: "listening-ear",
    name: "Listening Ear",
    goal: "Help the senior feel heard and emotionally supported.",
    focusAreas: ["Empathy", "Validation", "Letting the senior lead"],
    guidance: ["Encourage sharing", "Validate emotions", "Do not interrupt", "Avoid solving unless asked"],
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  "resolve-task": {
    type: "resolve-task",
    name: "Resolve a Task",
    goal: "Help the senior complete a specific task successfully.",
    focusAreas: ["Clear instructions", "Breaking steps down", "Checking understanding"],
    guidance: ["Explain steps clearly and slowly", "Break tasks into simple parts", "Check understanding frequently", "Be patient and reassuring"],
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
}

export default function ChatTraining() {
  const params = useParams()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [scenarioType] = useState<ScenarioType>("listening-ear")
  const [difficulty, setDifficulty] = useState<"Easy" | "Hard">("Easy")

  const scenario: ScenarioConfig = {
    ...SCENARIO_CONFIGS[scenarioType],
    difficulty,
    maxTurns: difficulty === "Hard" ? 8 : 10,
  }

  const handleDifficultyChange = (value: "Easy" | "Hard") => setDifficulty(value)

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

  const getPortraitUrl = () => "/elderly-woman-cartoon-avatar-smiling-grandmother.jpg"

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function sendMessageToPersona(userMessage: string): Promise<string> {
    const responses = [
      "That's very thoughtful of you to ask! You know, that reminds me of when I first met my dear spouse at a community dance.",
      "Oh, I appreciate your interest. Not many young people take the time to listen these days. My late spouse was just like you.",
      "Well, let me tell you a story about that. It was back in 1965, and I had just moved to the city...",
      "You're very kind. My spouse and I met at the library, would you believe it? We both reached for the same book!",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  async function evaluateConversation(userMessage: string, personaResponse: string): Promise<EvaluationResult> {
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
    const rapportChange = Math.floor(Math.random() * 20) - 5
    return {
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      expression: expressions[Math.floor(Math.random() * expressions.length)],
      rapportChange,
      suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
    }
  }

  const updateHealthBar = (change: number) => setRapport((prev) => Math.min(Math.max(prev + change, 0), 100))
  const updateAvatarExpression = (newExpression: Expression) => setExpression(newExpression)
  const getHealthBarColor = () => (rapport >= 70 ? "bg-emerald-500" : rapport >= 40 ? "bg-amber-500" : "bg-rose-500")
  const getSentimentColor = (sentiment: "positive" | "neutral" | "negative") =>
    sentiment === "positive" ? "text-emerald-600" : sentiment === "negative" ? "text-rose-600" : "text-gray-600"

  const handleSend = async () => {
    if (!inputValue.trim() || conversationEnded) return

    const userMessage: Message = { id: Date.now().toString(), sender: "user", text: inputValue, timestamp: new Date() }
    setMessages([...messages, userMessage])
    const userText = inputValue
    setInputValue("")
    setCurrentTurn((prev) => prev + 1)

    const personaResponseText = await sendMessageToPersona(userText)
    const personaMessage: Message = { id: (Date.now() + 1).toString(), sender: "persona", text: personaResponseText, timestamp: new Date() }
    setMessages((prev) => [...prev, personaMessage])

    const evaluation = await evaluateConversation(userText, personaResponseText)
    setLastEvaluation(evaluation)
    updateHealthBar(evaluation.rapportChange)
    updateAvatarExpression(evaluation.expression)

    if (currentTurn + 1 >= scenario.maxTurns) setConversationEnded(true)
  }

  const handleEndEarly = () => router.push("/complete")

  return (
    <div className="h-screen flex flex-col bg-[#F5F6F8]">
      {/* Sticky HUD */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-300 shadow-md px-3 py-2 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link href="/personas">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-600 hover:text-gray-900 bg-transparent">
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <span className="text-sm font-bold text-gray-900 truncate">{scenario.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={difficulty} onValueChange={handleDifficultyChange} disabled={currentTurn > 1}>
              <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy" className="text-xs">Easy</SelectItem>
                <SelectItem value="Hard" className="text-xs">Hard</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs font-bold text-gray-700">{currentTurn}/{scenario.maxTurns}</span>
          </div>
        </div>

        {/* Rapport Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src={getPortraitUrl()} alt={personaName} className="w-12 h-12 rounded-full object-cover border-2 border-gray-300" />
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                expression === "happy" ? "bg-green-500" : expression === "sad" ? "bg-blue-500" : expression === "angry" ? "bg-red-500" : "bg-gray-400"
              }`}
              title={expression}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">Rapport</span>
              <span className="text-xs font-bold text-gray-900">{rapport}%</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`absolute inset-y-0 left-0 ${getHealthBarColor()} transition-all duration-500`} style={{ width: `${rapport}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Avatar - 50% height */}
      <div className="flex-none h-1/2 bg-[#F5F6F8] flex justify-center items-center">
        <img src={getPortraitUrl()} alt={personaName} className="object-contain h-full rounded-3xl shadow-lg border-2 border-gray-300" />
      </div>

      {/* Scrollable Chat */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="max-w-3xl mx-auto space-y-2.5" ref={scrollRef}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${message.sender === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-900"}`}>
                <p className="text-sm leading-relaxed">{message.text}</p>
                <span className={`text-xs mt-1 block ${message.sender === "user" ? "text-blue-100" : "text-gray-500"}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Feedback below persona messages */}
              {message.sender === "persona" && lastEvaluation && (
                <Card className="bg-gray-50 border border-gray-200 mt-1 text-sm px-3 py-2">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${getSentimentColor(lastEvaluation.sentiment)}`}>{lastEvaluation.sentiment.toUpperCase()}</span>
                    <span className="text-gray-600 text-xs">{lastEvaluation.expression}</span>
                  </div>
                  <p className="text-gray-700 mt-1">{lastEvaluation.suggestion}</p>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Input */}
      <div className="border-t border-gray-300 bg-white shadow-lg px-3 py-2.5">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            placeholder={conversationEnded ? "Session ended" : "Type your message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={conversationEnded}
            className="flex-1 h-10 text-sm bg-gray-50 border-gray-300 disabled:opacity-50"
          />
          <Button onClick={handleSend} size="icon" disabled={conversationEnded} className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {!conversationEnded && (
          <Button onClick={handleEndEarly} variant="outline" size="sm" className="w-full mt-2 text-gray-600 hover:text-gray-900 border-gray-300 bg-transparent h-8 text-xs">
            End Session Early
          </Button>
        )}

        {conversationEnded && (
          <div className="space-y-2 mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
              <p className="text-sm font-semibold text-blue-700">Session Complete</p>
              <p className="text-xs text-gray-600 mt-0.5">Review your performance</p>
            </div>
            <Link href="/complete">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 text-sm">View Results</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
