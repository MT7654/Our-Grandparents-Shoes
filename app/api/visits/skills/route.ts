import { NextRequest, NextResponse } from "next/server"
import { guard } from "@/lib/auth/guard"
import { transaction } from "@/lib/neon/pool"
import { isUuid } from "@/lib/chat/live-rules"
import { getMessages } from "@/lib/chat/message"
import { getChallenge, type SkillReport } from "@/lib/visits/challenges"
import { assessFocus } from "@/lib/visits/skill-assessment"
import { generateLiveReply } from "@/lib/llm/chat"
import personas from "@/lib/personas.json"

export async function GET() {
  const auth = await guard("user")
  if (auth instanceof NextResponse) return auth
  const uid = auth.session.user.id
  const visits = await transaction(
    uid,
    async (db) =>
      (
        await db.query(
          `select vid,challenge_id,difficulty,created_at as started_at,skill_report,skill_flag,
      (select content from messages m where m.vid=c.vid order by sent_at,mid limit 1) as opening
      from conversations c where uid=$1 and completed and challenge_id is not null order by created_at desc`,
          [uid],
        )
      ).rows,
  )
  return NextResponse.json({ visits })
}

export async function POST(req: NextRequest) {
  const auth = await guard("user")
  if (auth instanceof NextResponse) return auth
  const uid = auth.session.user.id
  const { vid, action, text } = await req.json()
  if (!isUuid(vid))
    return NextResponse.json({ error: "Invalid visit" }, { status: 400 })
  const visit = await transaction(
    uid,
    async (db) =>
      (
        await db.query(
          "select * from conversations where uid=$1 and vid=$2 and completed",
          [uid, vid],
        )
      ).rows[0],
  )
  if (!visit)
    return NextResponse.json({ error: "Visit unavailable" }, { status: 404 })
  const focus = getChallenge(visit.challenge_id, visit.scenario_name)
  if (!focus) return NextResponse.json({ focus: null })
  let report: SkillReport | null = visit.skill_report
  if (action === "flag") {
    await transaction(null, (db) =>
      db.query(
        "update conversations set skill_flag=true where uid=$1 and vid=$2 and skill_report is not null",
        [uid, vid],
      ),
    )
    return NextResponse.json({ flagged: true })
  }
  const messages = await getMessages(vid)
  if (action === "replay") {
    if (typeof text !== "string" || !text.trim() || text.length > 800)
      return NextResponse.json(
        { error: "Use 1 to 800 characters." },
        { status: 400 },
      )
    const turn = report?.turn ?? -1
    if (turn < 1 || messages[turn]?.sender !== "user")
      return NextResponse.json(
        { error: "Exchange unavailable" },
        { status: 409 },
      )
    const outcome = await generateLiveReply(
      visit.scenario_name,
      visit.difficulty,
      personas.Margaret,
      messages.slice(0, turn),
      text.trim(),
    )
    return NextResponse.json({ reply: outcome.text })
  }
  if (action !== "review")
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  if (!report) {
    try {
      const assessed = await assessFocus(focus, messages)
      report = await transaction(
        null,
        async (db) =>
          (
            await db.query(
              "update conversations set skill_report=coalesce(skill_report,$3::jsonb) where uid=$1 and vid=$2 returning skill_report",
              [uid, vid, JSON.stringify(assessed)],
            )
          ).rows[0].skill_report,
      )
    } catch {
      /* The volunteer can retry this saved visit. */
    }
  }
  return NextResponse.json({
    focus: focus.id,
    report,
    flagged: visit.skill_flag,
    prompt: report && report.turn > 0 ? messages[report.turn - 1]?.content : "",
  })
}
