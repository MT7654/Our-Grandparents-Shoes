"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useParams } from "next/navigation"
import type { Database } from '@/supabase/types'
import LoadingOverlay from "@/components/loading-overlay"
import { useToast } from "@/hooks/use-toast"

type Message = Database['public']['Tables']['messages']['Row']

export default function AdminChatView() {
    const params = useParams()
    const uid = params.uid as string
    const vid = params.vid as string
    const scrollRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState<Message[]>([])

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await fetch(`/api/admin/chat?vid=${vid}`, { method: "GET" })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `Failed to load messages (${response.status})`)
                }

                const data = await response.json()
                setMessages(data.messages || [])
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load messages'
                console.error("Load error: ", error)
                toast({
                    title: "Error loading messages",
                    description: errorMessage,
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchMessages()
    }, [vid, toast])

    const toLocalDate = (input: string) => {
        const localDate = new Date(input)
        return localDate.toLocaleTimeString([], { hour: "2-digit", minute: '2-digit' })
    }

    // Auto-scroll to latest message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="min-h-screen bg-[#F5F6F8]">

            <LoadingOverlay isLoading={loading} />

            {/* Header */}
            <div className="border-b border-gray-200 bg-white shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <Link href={`/admin/volunteer/${uid}`}>
                        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Volunteer
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-4 max-w-3xl space-y-4">
                {/* Read-only notice */}
                <Card className="bg-amber-50 border-amber-200 p-4">
                    <p className="text-amber-700 text-sm font-medium">View-only mode — This is a record of the volunteer&apos;s conversation.</p>
                </Card>

                {/* Conversation Log */}
                <Card className="bg-white border-gray-200 flex flex-col h-[calc(100vh-220px)]">
                    <div className="border-b border-gray-200 p-3 bg-gray-50">
                        <h4 className="font-bold text-gray-800 text-sm">Conversation Log</h4>
                    </div>

                    <div className="p-4 space-y-3 overflow-y-auto flex-1" ref={scrollRef}>
                        {messages.length === 0 && !loading && (
                            <div className="text-center text-gray-400 py-8">No messages in this conversation.</div>
                        )}
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
            </div>
        </div>
    )
}
