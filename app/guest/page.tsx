"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { sceneFor, visits, type Visit } from "@/lib/visits/scenes"

const scenarios = [...new Set(visits.map(visit => visit.scenario))]
const descriptions: Record<string, string> = {
  "House Visit": "Check whether now is a good time to visit.",
  "Emotional Listening Ear": "Keep Margaret company on a quiet morning.",
  "Resolve a Task": "Offer a hand while Margaret works at her table."
}

type Message = { sender: "persona" | "user"; content: string }

export default function GuestPractice() {
  const [visit, setVisit] = useState<Visit | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const scene = visit && sceneFor(visit.scenario, messages)

  const expression = scene?.ended ? "happy" : visit?.scenario === "Emotional Listening Ear" ? "worried" : "neutral"

  function start(scenario: string) {
    const variants = visits.filter(item => item.scenario === scenario)
    const selected = variants[Math.floor(Math.random() * variants.length)]
    setVisit(selected)
    setMessages([{ sender: "persona", content: selected.opening }])
  }

  return (
    <main className="min-h-dvh bg-[var(--visit-paper)] px-4 py-6 text-[var(--visit-ink)] sm:py-10">
      <div className="mx-auto max-w-xl space-y-5">
        <nav aria-label="Guest navigation" className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">Guided demo</span>
          <Link href="/auth" className="underline">Sign in for live AI practice</Link>
        </nav>
        <h1 className="text-3xl font-semibold">{visit
          ? visit.scenario.replace("Emotional Listening Ear", "Listening Ear")
          : "Choose a visit with Margaret"}</h1>
        {visit && scene ? (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-4 overflow-hidden rounded-xl border bg-card">
              <img src={`/visit/margaret-${expression}.webp`} alt="Margaret Chan" className="size-[clamp(4rem,14dvh,8rem)] object-cover" />
              <div><h2 className="font-semibold">Margaret Chan</h2><p className="capitalize text-muted-foreground">{expression}</p></div>
            </div>
            <ol aria-label="Conversation" aria-live="polite" className="space-y-3">
              {messages.map((message, index) => (
                <li key={index} className="rounded-xl bg-white p-4">
                  <strong>{message.sender === "persona" ? "Margaret" : "You"}</strong>
                  <p>{message.content}</p>
                </li>
              ))}
            </ol>
            {scene.ended ? (
              <div role="status">
                <h2 className="text-xl font-semibold">Visit complete</h2>
                <p>How did your response leave room for Margaret to decide?</p>
              </div>
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-2 font-semibold">Choose your response</legend>
                {scene.choices.map(choice => (
                  <Button key={choice.label} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal text-left" onClick={() =>
                    setMessages([...messages, { sender: "user", content: choice.label }, { sender: "persona", content: choice.reply }])
                  }>{choice.label}</Button>
                ))}
              </fieldset>
            )}
            <Button variant={scene.ended ? "default" : "ghost"} onClick={() => { setVisit(null); setMessages([]) }}>
              {scene.ended ? "Choose another visit" : "Leave visit"}
            </Button>
          </>
        ) : (
          <>
            <p>Choose from scripted responses at each step. This guided demo is not live AI practice, and guest visits are not saved.</p>
            {scenarios.map(name => (
              <Card key={name} className="gap-2 p-5">
                <h2 className="text-xl font-semibold">{name.replace("Emotional Listening Ear", "Listening Ear")}</h2>
                <p>{descriptions[name]}</p>
                <Button className="mt-2 self-start" onClick={() => start(name)} aria-label={`Start ${name}`}>Start visit</Button>
              </Card>
            ))}
          </>
        )}
      </div>
    </main>
  )
}
