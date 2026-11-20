"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import scenarios from "@/lib/scenarios.json"
type Key = keyof typeof scenarios
type Assignment = {
  id: string
  due_date: string
  difficulty: string
  scenarios: Key[]
}
type Attempt = {
  vid: string
  scenario_name: Key
  practice_context: string
  completed: boolean
}
export function Assignments() {
  const [data, setData] = useState<{
    assignments: Assignment[]
    attempts: Attempt[]
  } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch("/api/assignments")
      .then((r) => {
        if (!r.ok) throw Error()
        return r.json()
      })
      .then(setData)
      .catch(() => setFailed(true))
  }, [])
  return (
    <section id="assignments" className="space-y-2 mb-6">
      <h2 className="font-semibold">Assignments</h2>
      {!data
        ? failed
          ? "Assignments unavailable"
          : "Loading…"
        : data.assignments.length === 0
          ? "No assignments due."
          : data.assignments.map((a) => (
              <article key={a.id} className="border rounded p-3">
                <p>
                  {a.difficulty} · Due {a.due_date} (Singapore)
                </p>
                {a.scenarios.map((k) => {
                  const matches = data.attempts.filter(
                    (t) =>
                      t.practice_context === "assignment:" + a.id &&
                      t.scenario_name === k
                  )
                  const attempt = matches.find((t) => t.completed) ?? matches[0]
                  return (
                    <p key={k}>
                      <Link
                        className="underline"
                        href={
                          attempt?.completed
                            ? "/dashboard/review/" + attempt.vid
                            : "/chat/" +
                              scenarios[k].id +
                              "?context=assignment:" +
                              a.id +
                              "&difficulty=" +
                              a.difficulty
                        }
                      >
                        {attempt?.completed
                          ? "Review"
                          : attempt
                            ? "Resume"
                            : "Start"}{" "}
                        {scenarios[k].name}
                      </Link>
                    </p>
                  )
                })}
              </article>
            ))}
      {data?.attempts
        .filter((t) => !t.completed && t.practice_context === "standalone")
        .map((t) => (
          <p key={t.vid}>
            <Link href={"/chat/" + scenarios[t.scenario_name].id}>
              Resume {scenarios[t.scenario_name].name}
            </Link>
          </p>
        ))}
    </section>
  )
}
