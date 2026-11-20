import { NextRequest, NextResponse } from "next/server"
import { getChallenge } from "@/lib/visits/challenges"
import { guard } from "@/lib/auth/guard"
import { createClient } from "@/lib/neon/data"
export async function GET() {
  const auth = await guard("admin")
  if (auth instanceof NextResponse) return auth
  const db = await createClient()
  const results = await Promise.all([
    db.from("visit_cohorts").select("id,name,visit_memberships(uid,left_at)"),
    db.from("profiles").select("user_id,full_name").eq("role", "user"),
    db.from("visit_assignments").select("*,visit_recipients(uid)"),
    db.from("visit_assignment_status").select("*"),
    db
      .from("conversations")
      .select("uid,vid,scenario_name,practice_context,completed,challenge_id,skill_report,skill_flag")
      .like("practice_context", "assignment:%"),
    db.from("conversations").select("uid,vid,scenario_name,challenge_id,skill_report").eq("skill_flag",true)
  ])
  if (results.some((r) => r.error))
    return NextResponse.json(
      { error: "Unable to load cohorts" },
      { status: 503 }
    )
  return NextResponse.json({
    cohorts: results[0].data,
    volunteers: results[1].data,
    assignments: results[2].data,
    statuses: results[3].data,
    attempts: results[4].data,
    flagged:results[5].data
  })
}
export async function POST(req: NextRequest) {
  const auth = await guard("admin")
  if (auth instanceof NextResponse) return auth
  const db = await createClient(),
    b = await req.json()
  let response
  switch (b.operation) {
    case "reviewed":
      response = await db.from("conversations").update({skill_flag:false}).eq("vid",b.vid).eq("skill_flag",true)
      break
    case "create":
      response = await db.from("visit_cohorts").insert({ name: b.name })
      break
    case "join":
      response = await db
        .from("visit_memberships")
        .insert({ cohort_id: b.cohort, uid: b.uid })
      break
    case "leave":
      response = await db
        .from("visit_memberships")
        .update({ left_at: new Date().toISOString() })
        .eq("cohort_id", b.cohort)
        .eq("uid", b.uid)
        .is("left_at", null)
      break
    case "assign":
      if (b.focus && (!Array.isArray(b.scenarios) || b.scenarios.length !== 1 || !getChallenge(b.focus,b.scenarios[0]))) return NextResponse.json({error:"Choose one matching scenario"},{status:400})
      response = await db
        .from("visit_assignments")
        .insert({
          cohort_id: b.cohort,
          scenarios: b.scenarios,
          difficulty: b.difficulty,
          challenge_id:b.focus || null,
          due_date: b.due
        })
      break
    default:
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 })
  }
  return NextResponse.json(
    { saved: !response.error },
    { status: response.error ? 400 : 200 }
  )
}
