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
  if (!entry) return status ? <p role="status" className="text-sm text-muted-foreground">{status}</p> : null
  return (
    <section aria-labelledby="visit-journal-heading" className="space-y-4 rounded-xl border border-border bg-card p-4 text-base leading-relaxed text-card-foreground">
      <h2 id="visit-journal-heading" className="text-lg font-semibold leading-snug">Visit journal</h2>
      <img
        src="/visit/flat.webp"
        alt="Margaret’s table with her radio, recipe cards and seed packets"
        className="h-28 w-full rounded-lg object-cover sm:h-36"
      />
      <p>{scenarios[scenario].objective}</p>
      <blockquote className="rounded-r-lg border-l-4 border-border bg-secondary px-3 py-2 [overflow-wrap:anywhere]">{entry.moment.content}</blockquote>
      <Link
        className="font-semibold text-primary underline underline-offset-4"
        href={"/dashboard/review/" + vid + "/chat#" + entry.moment.mid}
      >
        Read this exchange
      </Link>
      {entry.choices.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer rounded-lg border border-border px-3 py-2 font-semibold text-primary">Retry this moment</summary>
          <div className="flex flex-wrap gap-2 my-3">
            {entry.choices.map((choice) => (
              <button
                className="min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-left text-primary hover:bg-accent [overflow-wrap:anywhere]"
                key={choice}
                onClick={() => save({ choice, id: crypto.randomUUID() })}
              >
                {choice}
              </button>
            ))}
          </div>
          <p aria-live="polite">{outcome}</p>
        </details>
      )}
      <label className="block">
        Private reflection
        <textarea
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 block min-h-24 w-full rounded-lg border border-input bg-card p-2 text-base"
        />
      </label>
      <button className="font-semibold text-primary underline underline-offset-4" onClick={() => save({ reflection: note })}>
        Save reflection
      </button>
      <span role="status">{status}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
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
