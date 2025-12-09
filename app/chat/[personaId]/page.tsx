"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Send, Lightbulb, Activity } from "lucide-react"
import { useParams } from "next/navigation"
import type { Database } from '@/supabase/types'
import LoadingOverlay from "@/components/loading-overlay"

type Message = Database['public']['Tables']['messages']['Row']
type Expression = Database['public']['Enums']['eval_expression']
type Sentiment = Database['public']['Enums']['eval_sentiment']

export default function ChatTraining() {
    const params = useParams()
    const personaId = params.personaId as string
    const scrollRef = useRef<HTMLDivElement>(null)

    // Import useRouter from next/navigation
    const { useRouter } = require("next/navigation");
    const router = useRouter();

    const [loading, setLoading] = useState(true)
    const [verseId, setVerseId] = useState<string>('')
    const [chatId, setChatId] = useState<string>('')
    const [personaName, setPersonaName] = useState<string>('Margaret Thompson')
    const [messages, setMessages] = useState<Message[]>([])
    const [rapport, setRapport] = useState<number>(50)
    const [sentiment, setSentiment] = useState<Sentiment>('neutral')
    const [expression, setExpression] = useState<Expression>("neutral")
    const [objective, setObjective] = useState("Get the senior to talk about how they met their spouse")
    const [suggestion, setSuggestion] = useState("Try asking about their day or showing interest in their well-being")
    const [avatarError, setAvatarError] = useState(false)
    const [lastEvaluation, setLastEvaluation] = useState(false)
    const [rapportChange, setRapportChange] = useState(0)
    const [inputValue, setInputValue] = useState("")

    // Start Conversation (Load Data)
    useEffect(() => {
        const begin = async () => {
            try {
                const [conversationResponse, personaResponse] = await Promise.all([
                    fetch('/api/chat/start', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            personaId: personaId
                        }), 
                    }),
                    fetch(`/api/personas?id=${personaId}`, { method: "GET" }),
                ])

                if (!personaResponse.ok) {
                    throw new Error(`Fetch Persona Error: ${personaResponse.status} ${personaResponse.statusText}`)
                }

                const { persona } = await personaResponse.json()
                
                if (!persona) {
                    throw new Error('Error fetching persona')
                }

                setPersonaName(persona.name)

                if (!conversationResponse.ok) {
                    throw new Error(`Start Conversation Error: ${conversationResponse.status} ${conversationResponse.statusText}`)
                }

                const conversationData = await conversationResponse.json()

                if (!conversationData) {
                    throw new Error('Error starting conversation')
                }

                const { chat, conversation, messages, evaluation } = conversationData
                setVerseId(conversation.vid)
                setChatId(conversation.cid)

                if (messages) {
                    setMessages(messages)
                }
                
                if (evaluation) {
                    setSentiment(evaluation.sentiment)
                    setRapport(evaluation.rapport)
                    setExpression(evaluation.expression)
                    setSuggestion(evaluation.suggestion)
                    setLastEvaluation(true)
                }

                if (chat) {
                    setObjective(chat.objective)
                }
            } catch (error) {
                console.error("Load error: ", error)
            } finally {
                setLoading(false)
            }
        }

        begin()
    }, [personaId])

    // Converse 
    const converse = async () => {
        setLoading(true)

        try {
            const response = await fetch('/api/chat/next', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId,
                    latestMessage: inputValue
                })
            })

            if (!response.ok) {
                throw new Error(`Error Continuing Conversation: ${response.status} ${response.statusText}`)
            }

            const { user_message, persona_message, evaluation, rapport_change } = await response.json()

            // Set Variables
            if (user_message) {
                setMessages(prev => [...prev, user_message, persona_message])
            } else {
                setMessages(prev => [...prev, persona_message])
            }
            

            if (evaluation) {
                // Update Avatar Expression
                setExpression(evaluation.expression)
                setAvatarError(false)

                // Update System Suggestion
                setSuggestion(evaluation.suggestion)

                // Update Rapport
                setRapport(evaluation.rapport)

                setSentiment(evaluation.sentiment)
                setLastEvaluation(true)
            }

            if (rapport_change) {
                setRapportChange(rapport_change)
            }
        } catch (error) {
            console.error('Converse Error: ', error)
        } finally {
            setInputValue("")
            setLoading(false)
        }
    }

    // End Conversation (Save Data)
    const end = async () => {
        setLoading(true)

        try {
            const response = await fetch('/api/chat/end', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    converseId: verseId
                })
            })

            if (!response.ok) {
                throw new Error(`Error Ending Conversation: ${response.status} ${response.statusText}`)
            }
        } catch (error) {
            console.error('Save Error: ', error)
        } finally {
            setLoading(false)
            router.push(`/complete/${verseId}`)
        }
    }

    // Helpers
    const toLocalDate = (input: string) => {
        const localDate = new Date(input)
        return localDate.toLocaleTimeString([], { hour: "2-digit", minute: '2-digit' })
    }

    const getPortraitUrl = (expr: Expression) => {
        // Map expression to image filename
        // Images are named: Happy.jpg, Sad.jpg, Angry.jpg, Neutral.jpg, Shocked.jpg in public folder
    
        const emotionMap: Record<Expression, string> = {
            happy: "Happy",
            sad: "Sad",
            angry: "Angry",
            neutral: "Neutral",
            shocked: "Shocked",
        }
    
        const emotion = emotionMap[expr] || "Neutral"
        
        // Return the image path - images are shared for both personas
        return `/${emotion}.jpg`
    }
    
    const handleAvatarError = () => {
        // Fallback to neutral avatar if image fails to load
        if (!avatarError) {
            setAvatarError(true)
            setExpression("neutral")
        }
    }

    // Auto-scroll to latest message
    useEffect(() => {
        if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

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

        <LoadingOverlay isLoading={loading} />

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
                src={getPortraitUrl(expression)}
                alt={`${personaName} - ${expression} expression`}
                className="w-[150px] h-[150px] max-[600px]:w-[120px] max-[600px]:h-[120px] object-cover rounded-full border-4 border-gray-300 transition-opacity duration-300"
                style={{ flex: "0 0 auto" }}
                onError={(e) => {
                    // Fallback to placeholder if image fails
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                    handleAvatarError()
                }}
                onLoad={() => setAvatarError(false)}
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
                    <p className={`font-bold capitalize ${getSentimentColor(sentiment)}`}>
                    {sentiment}
                    </p>
                </div>
                <div>
                    <span className="text-gray-600 font-medium">Expression:</span>
                    <p className="font-bold text-purple-700 capitalize">{expression}</p>
                </div>
                <div>
                    <span className="text-gray-600 font-medium">Rapport:</span>
                    <p className={`font-bold ${rapportChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {rapportChange >= 0 ? "+" : ""}
                    {rapportChange}
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
                <div key={message.mid} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
                    }`}
                    >
                    <p className="leading-relaxed text-sm">{message.content}</p>
                    <span
                        className={`text-xs mt-1 block ${message.sender === "user" ? "text-blue-100" : "text-gray-500"}`}
                    >
                        {toLocalDate(message.sent_at)}
                    </span>
                    </div>
                </div>
                ))}
            </div>
            </Card>

            {/* 6. End Training Button */}
            <Button 
                className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-semibold py-3.5 rounded-lg shadow-md"
                onClick={end}
            >
                End Training Session
            </Button>
        </div>

        {/* Input Bar */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-300 bg-white shadow-lg p-4">
            <div className="container mx-auto max-w-3xl">
            <div className="flex gap-2">
                <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && converse()}
                className="flex-1 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
                <Button onClick={converse} size="icon" className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4" />
                </Button>
            </div>
            </div>
        </div>
        </div>
    )
}