"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import scenarios from "@/lib/scenarios.json"
type Entry = {
  moment: { mid: string; content: string }
  choices: string[]
  reflection: string
}
export function Journal({
  vid,
  scenario
}: {
  vid: string
  scenario: keyof typeof scenarios
}) {
  const [entry, setEntry] = useState<Entry | null>(null),
    [note, setNote] = useState(""),
    [outcome, setOutcome] = useState(""),
    [status, setStatus] = useState("")
  useEffect(() => {
    let live = true
    fetch("/api/visits/journal?vid=" + vid)
      .then((r) => {
        if (!r.ok) throw Error()
        return r.json()
      })
      .then((e) => {
        if (live && e) {
          setEntry(e)
          setNote(e.reflection)
        }
      })
      .catch(() => {
        if (live) setStatus("Journal unavailable")
      })
    return () => {
      live = false
    }
  }, [vid])
  async function save(payload: object) {
    try {
      const r = await fetch("/api/visits/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vid, ...payload })
      })
      if (!r.ok) throw Error()
      const data = await r.json()
      if (data.outcome) setOutcome(data.outcome)
      setStatus(data.saved ? "Reflection saved" : "Retry saved")
    } catch {
      setStatus("Could not save. Please try again.")
    }
  }
  if (!entry) return <p role="status">{status}</p>
  return (
    <section className="workspace-panel space-y-4 border rounded-xl p-5 bg-card">
      <h2 className="text-xl font-semibold">Visit journal</h2>
      <img
        src="/visit/flat.webp"
        alt="Margaret’s table with her radio, recipe cards and seed packets"
        className="h-32 w-full object-cover rounded"
      />
      <p>{scenarios[scenario].objective}</p>
      <blockquote>{entry.moment.content}</blockquote>
      <Link
        className="underline"
        href={"/dashboard/review/" + vid + "/chat#" + entry.moment.mid}
      >
        Read this exchange
      </Link>
      <details>
        <summary>Retry this moment</summary>
        <div className="flex flex-wrap gap-2 my-3">
          {entry.choices.map((choice) => (
            <button
              className="border rounded p-2 bg-white"
              key={choice}
              onClick={() => save({ choice, id: crypto.randomUUID() })}
            >
              {choice}
            </button>
          ))}
        </div>
        <p aria-live="polite">{outcome}</p>
      </details>
      <label className="block">
        Private reflection
        <textarea
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="block w-full bg-white border p-2"
        />
      </label>
      <button className="underline" onClick={() => save({ reflection: note })}>
        Save reflection
      </button>
      <span role="status">{status}</span>
      <div className="section-links">
        <Link href={"/chat/" + scenarios[scenario].id}>
          Practise this scenario again
        </Link>
        <Link href={"/scenarios?context=series:" + vid}>
          Visit Margaret again
        </Link>
      </div>
    </section>
  )
}
