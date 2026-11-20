import { NextRequest, NextResponse } from "next/server"
import { guard } from "@/lib/auth/guard"
import { createClient } from "@/lib/neon/data"
import scenarios from "@/lib/scenarios.json"

function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(value)
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  )
}

export async function GET(request: NextRequest) {
  const auth = await guard("admin")
  if (auth instanceof NextResponse) return auth
  const query = request.nextUrl.searchParams
  const first_day = query.get("from") ?? ""
  const last_day = query.get("to") ?? ""
  const cohort_filter = query.get("cohort") || null
  const scenario_filter = query.get("scenario") || null
  if (
    !date(first_day) ||
    !date(last_day) ||
    last_day < first_day ||
    (scenario_filter &&
      !Object.prototype.hasOwnProperty.call(scenarios, scenario_filter))
  ) {
    return NextResponse.json(
      { error: "Invalid reporting period or scenario" },
      { status: 400 }
    )
  }
  const db = await createClient()
  const { data, error } = await db.rpc("practice_usage", {
    first_day,
    last_day,
    scenario_filter,
    cohort_filter
  })
  if (error)
    return NextResponse.json(
      { error: "Participation is unavailable" },
      { status: 503 }
    )
  for (const row of data) {
    for (const key of ["eligible", "participants", "sessions"])
      row[key] = Number(row[key])
  }
  if (query.get("format") === "csv") {
    const cols = [
      "kind",
      "label",
      "starts",
      "ends",
      "participants",
      "eligible",
      "sessions",
      "percentage"
    ]
    const rows = data.map((r: Record<string, string | number>) =>
      cols
        .map((c) =>
          c === "percentage"
            ? +r.eligible
              ? ((100 * +r.participants) / +r.eligible).toFixed(1)
              : ""
            : r[c]
        )
        .join(",")
    )
    return new Response([cols.join(","), ...rows].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=participation.csv"
      }
    })
  }
  return NextResponse.json(data)
}
