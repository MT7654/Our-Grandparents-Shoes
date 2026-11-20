"use client"
import { useEffect, useState } from "react"
import scenarios from "@/lib/scenarios.json"

type Row = {
  kind: string
  label: string
  starts: string
  ends: string
  participants: number
  eligible: number
  sessions: number
}
function period(n: number) {
  const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
  const first = new Date(day.slice(0, 7) + "-01T00:00:00Z")
  const last = n ? new Date(+first - 1).toISOString().slice(0, 10) : day
  first.setUTCMonth(first.getUTCMonth() - n)
  return [first.toISOString().slice(0, 10), last]
}
const rate = (r: Row) =>
  r.eligible
    ? ((100 * r.participants) / r.eligible).toLocaleString(undefined, {
        maximumFractionDigits: 1
      }) + "%"
    : "Unavailable"
export function Participation() {
  const [months, setMonths] = useState("3")
  const [[from, to], setRange] = useState(() => period(3))
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([])
  const [cohort, setCohort] = useState("")
  useEffect(() => {
    fetch("/api/admin/cohorts")
      .then((r) => r.json())
      .then((data) => setCohorts(data.cohorts ?? []))
      .catch(() => {})
  }, [])
  const [scenario, setScenario] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState(false)
  const url =
    "/api/admin/usage?" + new URLSearchParams({ from, to, scenario, cohort })
  useEffect(() => {
    const controller = new AbortController()
    setRows([])
    setError(false)
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error()
        return r.json()
      })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [url])
  const total = rows.find((r) => r.kind === "period")
  return (
    <section className="mb-8 space-y-4 rounded-xl border bg-white p-6">
      <h2 className="text-2xl font-semibold">Volunteer participation</h2>
      <div className="flex flex-wrap items-end gap-4">
        <label>
          Period{" "}
          <select
            value={months}
            onChange={(e) => {
              setMonths(e.target.value)
              if (e.target.value !== "custom")
                setRange(period(Number(e.target.value)))
            }}
          >
            {[1, 3, 6, 12].map((n) => (
              <option value={n} key={n}>
                {n} complete months
              </option>
            ))}
            <option value="0">Month to date</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        <label>
          From{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setMonths("custom")
              setRange([e.target.value, to])
            }}
          />
        </label>
        <label>
          To{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setMonths("custom")
              setRange([from, e.target.value])
            }}
          />
        </label>
        <label>
          Cohort{" "}
          <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
            <option value="">All cohorts</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scenario{" "}
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="">All scenarios</option>
            {Object.entries(scenarios).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p aria-live="polite">
        {total
          ? total.participants +
            " of " +
            total.eligible +
            " volunteers practised (" +
            rate(total) +
            ")"
          : error
            ? "Participation unavailable"
            : "Loading participation…"}
      </p>
      {total && (
        <>
          <figure>
            <figcaption>Monthly participation</figcaption>
            {rows
              .filter((r) => r.kind === "month")
              .map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-sm"
                >
                  <span>
                    {r.label}
                    {r.starts.slice(-2) !== "01" ||
                    new Date(r.ends + "T12:00:00Z").getUTCDate() !==
                      new Date(
                        Date.UTC(+r.ends.slice(0, 4), +r.ends.slice(5, 7), 0)
                      ).getUTCDate()
                      ? " (partial)"
                      : ""}
                  </span>
                  <progress
                    aria-label={r.label + " participation"}
                    max={r.eligible || 1}
                    value={r.participants}
                    className="w-full"
                  />
                  <span>{rate(r)}</span>
                </div>
              ))}
          </figure>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption>Practice during the selected Singapore dates</caption>
              <thead>
                <tr>
                  {[
                    "Group",
                    "From",
                    "To",
                    "Volunteers",
                    "Eligible",
                    "Rate",
                    "Sessions"
                  ].map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.kind + r.label}>
                    {[
                      r.label === "Emotional Listening Ear"
                        ? "Listening Ear"
                        : r.label,
                      r.starts,
                      r.ends,
                      r.participants,
                      r.eligible,
                      rate(r),
                      r.sessions
                    ].map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a className="underline" href={url + "&format=csv"}>
            Export CSV
          </a>
        </>
      )}
      <p className="text-sm">
        Figures reflect retained volunteer accounts and recorded practice.
      </p>
    </section>
  )
}
