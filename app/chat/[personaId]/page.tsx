"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"

type Message = {
  id: number
  sender: "user" | "persona"
  text: string
  aiFeedback?: string
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "persona",
      text: "Hello! How are you today?",
    },
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return
    const newMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      text: input,
      aiFeedback: "Try to be more empathetic and ask a follow-up question.",
    }
    setMessages([...messages, newMessage])
    setInput("")
    // TODO: Add Persona reply generation
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Goal */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold text-primary">Goal: Build rapport and practice empathetic listening</h2>
      </div>

      {/* Rapport progress bar */}
      <div className="mb-4">
        <label className="text-sm font-medium text-muted-foreground">Rapport Progress</label>
        <Progress value={40} className="h-3 rounded-full" />
      </div>

      {/* Chat log */}
      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-white space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {/* Message */}
            <div
              className={`max-w-[75%] p-3 rounded-lg ${
                msg.sender === "user" ? "bg-blue-50 self-end" : "bg-gray-100 self-start"
              }`}
            >
              <span>{msg.text}</span>
            </div>

            {/* AI guidance / feedback only for user messages */}
            {msg.sender === "user" && msg.aiFeedback && (
              <div className="text-xs text-muted-foreground mt-1 self-end italic bg-gray-50 p-1 rounded">
                {msg.aiFeedback}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input box */}
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  )
}
