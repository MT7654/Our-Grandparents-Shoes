"use client"
import { useState, useEffect } from "react"
import scenarios from "@/lib/scenarios.json"
type Directory = {
  statuses: {
    assignment_id: string
    uid: string
    started: boolean
    completed: boolean
  }[]
  attempts: {
    uid: string
    vid: string
    practice_context: string
    scenario_name: string
  }[]
  cohorts: {
    id: string
    name: string
    visit_memberships: { uid: string; left_at: string | null }[]
  }[]
  volunteers: { user_id: string; full_name: string }[]
  assignments: {
    id: string
    due_date: string
    scenarios: string[]
    visit_recipients: { uid: string }[]
  }[]
}
export function Cohorts() {
  const [data, setData] = useState<Directory | null>(null),
    [cohort, setCohort] = useState(""),
    [uid, setUid] = useState(""),
    [name, setName] = useState(""),
    [status, setStatus] = useState("")
  const [selected, setSelected] = useState<string[]>([]),
    [due, setDue] = useState(""),
    [difficulty, setDifficulty] = useState("Easy")
  async function load() {
    const r = await fetch("/api/admin/cohorts")
    if (!r.ok) throw Error()
    setData(await r.json())
  }
  useEffect(() => {
    load().catch(() => setStatus("Cohorts unavailable"))
  }, [])
  async function change(operation: string) {
    try {
      const r = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          name,
          cohort,
          uid,
          scenarios: selected,
          due,
          difficulty
        })
      })
      if (!r.ok) throw Error()
      await load()
      setStatus("Saved")
    } catch {
      setStatus("Could not save this change")
    }
  }
  const member = data?.cohorts
    .find((c) => c.id === cohort)
    ?.visit_memberships.some((m) => m.uid === uid && !m.left_at)
  return (
    <details className="p-5 border bg-white mb-6">
      <summary>Cohorts and assignments</summary>
      <div className="space-y-4 py-4">
        <label>
          Cohort name{" "}
          <input
            className="border"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>{" "}
        <button disabled={!name.trim()} onClick={() => change("create")}>
          Create cohort
        </button>
        <div>
          <label>
            Cohort{" "}
            <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
              <option value="">Choose cohort</option>
              {data?.cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label>
            Volunteer{" "}
            <select value={uid} onChange={(e) => setUid(e.target.value)}>
              <option value="">Choose volunteer</option>
              {data?.volunteers.map((v) => (
                <option key={v.user_id} value={v.user_id}>
                  {v.full_name}
                </option>
              ))}
            </select>
          </label>{" "}
          <button
            disabled={!cohort || !uid}
            onClick={() => change(member ? "leave" : "join")}
          >
            {member ? "Remove from cohort" : "Add to cohort"}
          </button>
        </div>
        <fieldset>
          <legend>Assign scenarios</legend>
          {Object.entries(scenarios).map(([k, v]) => (
            <label key={k} className="block">
              <input
                type="checkbox"
                checked={selected.includes(k)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, k]
                      : selected.filter((x) => x !== k)
                  )
                }
              />{" "}
              {v.name}
            </label>
          ))}
        </fieldset>
        <label>
          Difficulty{" "}
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>Easy</option>
            <option>Hard</option>
          </select>
        </label>{" "}
        <label>
          Due in Singapore{" "}
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <button
          disabled={!cohort || !due || !selected.length}
          onClick={() => change("assign")}
        >
          Assign to current members
        </button>
        {data?.assignments.map((a) => (
          <p key={a.id}>
            {a.scenarios.join(", ")} · Due {a.due_date} ·{" "}
            {a.visit_recipients.length} assigned ·{" "}
            {
              data.statuses.filter((s) => s.assignment_id === a.id && s.started)
                .length
            }{" "}
            started ·{" "}
            {
              data.statuses.filter(
                (s) => s.assignment_id === a.id && s.completed
              ).length
            }{" "}
            completed ·{" "}
            {a.due_date <
            new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
              ? data.statuses.filter(
                  (s) => s.assignment_id === a.id && !s.completed
                ).length
              : 0}{" "}
            overdue
            {data.attempts
              .filter((t) => t.practice_context === "assignment:" + a.id)
              .map((t) => (
                <a
                  key={t.vid}
                  className="block underline"
                  href={"/admin/volunteer/" + t.uid + "/chat/" + t.vid}
                >
                  {data.volunteers.find((v) => v.user_id === t.uid)?.full_name}{" "}
                  · {t.scenario_name}
                </a>
              ))}
          </p>
        ))}
        <p role="status">{status}</p>
      </div>
    </details>
  )
}
