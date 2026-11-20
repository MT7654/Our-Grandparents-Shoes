import { NextResponse } from "next/server"
import { guard } from "@/lib/auth/guard"
import { createClient } from "@/lib/neon/data"
export async function GET() {
  const auth = await guard("user")
  if (auth instanceof NextResponse) return auth
  const db = await createClient()
  const [assignments, attempts] = await Promise.all([
    db.from("visit_assignments").select("*").order("due_date"),
    db
      .from("conversations")
      .select("vid,scenario_name,completed,practice_context")
      .eq("uid", auth.session.user.id)
  ])
  if (assignments.error || attempts.error)
    return NextResponse.json(
      { error: "Assignments unavailable" },
      { status: 503 }
    )
  return NextResponse.json({
    assignments: assignments.data,
    attempts: attempts.data
  })
}
