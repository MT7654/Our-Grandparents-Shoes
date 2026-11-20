import { NextRequest, NextResponse } from "next/server"
import { guard } from "@/lib/auth/guard"
import { createClient } from "@/lib/neon/data"
import { getMessages } from "@/lib/chat/message"
import { sceneFor } from "@/lib/visits/scenes"

async function journal(vid: string) {
  const auth = await guard("user")
  if (auth instanceof NextResponse) return auth
  const db = await createClient()
  const { data: c } = await db
    .from("conversations")
    .select("scenario_name,practice_context")
    .eq("vid", vid)
    .eq("uid", auth.session.user.id)
    .eq("completed", true)
    .maybeSingle()
  if (!c)
    return NextResponse.json({ error: "Visit unavailable" }, { status: 404 })
  const messages = await getMessages(vid)
  const scene = sceneFor(c.scenario_name, messages)
  if (!scene?.ended) return NextResponse.json(null)
  const moment = messages.find(
    (m) =>
      m.sender === "persona" &&
      scene.visit.choices.some((a) => a.reply === m.content)
  )
  return { db, scene, moment, context: c.practice_context }
}
export async function GET(req: NextRequest) {
  const vid = req.nextUrl.searchParams.get("vid") ?? ""
  const result = await journal(vid)
  if (result instanceof NextResponse) return result
  const { db, moment, scene, context } = result
  const { data, error } = await db
    .from("visit_reflections")
    .select("body")
    .eq("vid", vid)
    .maybeSingle()
  if (error)
    return NextResponse.json(
      { error: "Reflection unavailable" },
      { status: 500 }
    )
  return NextResponse.json({
    moment,
    context,
    choices: scene.visit.choices.map((a) => a.label),
    reflection: data?.body ?? ""
  })
}
export async function POST(req: NextRequest) {
  const { vid, reflection, choice, id } = await req.json()
  const result = await journal(vid)
  if (result instanceof NextResponse) return result
  const { db, scene } = result
  if (typeof reflection === "string" && reflection.length <= 4000) {
    const { error } = await db
      .from("visit_reflections")
      .upsert({ vid, body: reflection })
    return NextResponse.json({ saved: !error }, { status: error ? 500 : 200 })
  }
  const action = scene.visit.choices.find((a) => a.label === choice)
  if (!action || typeof id !== "string")
    return NextResponse.json({ error: "Invalid retry" }, { status: 400 })
  const { error } = await db
    .from("visit_retries")
    .upsert(
      { id, vid, choice, outcome: action.reply },
      { ignoreDuplicates: true }
    )
  return NextResponse.json(
    { outcome: action.reply },
    { status: error ? 500 : 200 }
  )
}
