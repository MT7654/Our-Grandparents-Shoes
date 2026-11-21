import type { Database } from "../../supabase/types"
import type { MidConversationEvaluation, Score } from "../types/types"
import { reasonAfterAssessment, reasonAfterReply, type EndReason } from "./live-rules"

type Conversation = Database["public"]["Tables"]["conversations"]["Row"] & { end_reason: EndReason | null }
type Message = Database["public"]["Tables"]["messages"]["Row"]
type Evaluation = Database["public"]["Tables"]["evaluations"]["Row"]
type StoredScore = Database["public"]["Tables"]["scores"]["Row"]
type Receipt = { reply_id: string; evaluated: boolean; submitted_at: Date | string }
export type LiveDb = {
  query: <R extends Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: R[] }>
}

export class LiveChatError extends Error {
  constructor(message: string, public readonly status: 400 | 404 | 409) {
    super(message)
  }
}

const state = (conversation: Conversation) => ({
  completed: conversation.completed,
  turns: conversation.turns,
  end_reason: conversation.end_reason,
  objective_met: conversation.objective_met,
})

async function owned(db: LiveDb, owner: string, vid: string, lock = false) {
  const c = (await db.query<Conversation>(
    "select * from public.conversations where uid=$1 and vid=$2" + (lock ? " for update" : ""),
    [owner, vid],
  )).rows[0]
  if (!c) throw new LiveChatError("Visit not found.", 404)
  return c
}

async function receipt(db: LiveDb, vid: string, turn: string) {
  return (await db.query<Receipt>(
    "select reply_id,evaluated,submitted_at::text from public.visit_turns where vid=$1 and id=$2", [vid, turn],
  )).rows[0]
}

async function replyFor(db: LiveDb, c: Conversation, turn: string, text: string, saved: Receipt) {
  const pair = (await db.query<Message>(
    "select * from public.messages where vid=$1 and mid in ($2,$3)", [c.vid, turn, saved.reply_id],
  )).rows
  const user = pair.find(m => m.mid === turn && m.sender === "user")
  const persona = pair.find(m => m.mid === saved.reply_id && m.sender === "persona")
  if (!user || !persona || user.content !== text) throw new LiveChatError("This turn was already used for another reply.", 409)
  const expression = (await db.query<Evaluation>("select expression from public.evaluations where vid=$1", [c.vid])).rows[0]?.expression
  return { ...state(c), expression, user_message: user, persona_message: persona, pendingEvaluation: !saved.evaluated }
}

export async function getLiveReplay(db: LiveDb, owner: string, vid: string, turn: string, text: string) {
  const c = await owned(db, owner, vid, true)
  const saved = await receipt(db, vid, turn)
  if (saved) return replyFor(db, c, turn, text, saved)
  if (c.completed || c.turns <= 0) throw new LiveChatError("This visit has ended.", 409)
  return null
}

export async function commitLiveReply(db: LiveDb, input: {
  owner: string; vid: string; turn: string; previous: string; text: string; reply: string; requestedEnd: boolean; expression: Evaluation["expression"]; starting: number; respectedSpace?: boolean
}) {
  const { owner, vid, turn, previous, text, reply, requestedEnd } = input
  const c = await owned(db, owner, vid, true)
  const saved = await receipt(db, vid, turn)
  if (saved) return replyFor(db, c, turn, text, saved)
  if (c.completed || c.turns <= 0) throw new LiveChatError("This visit has ended.", 409)
  const latest = (await db.query<{ mid: string }>(
    "select mid from public.messages where vid=$1 order by sent_at desc,mid desc limit 1", [vid],
  )).rows[0]
  if (latest?.mid !== previous) throw new LiveChatError("This visit changed. Reopen it to continue.", 409)
  const user = (await db.query<Message>(
    "insert into public.messages(vid,mid,sender,content,sent_at) values($1,$2,'user',$3,clock_timestamp()) returning *",
    [vid, turn, text],
  )).rows[0]
  const persona = (await db.query<Message>(
    "insert into public.messages(vid,sender,content,sent_at) select $1,'persona',$2,greatest(clock_timestamp(),sent_at+interval '1 microsecond') from public.messages where vid=$1 and mid=$3 returning *",
    [vid, reply, turn],
  )).rows[0]
  await db.query(
    "insert into public.visit_turns(id,vid,reply_id) values($1,$2,$3)",
    [turn, vid, persona.mid],
  )
  const { n } = (await db.query<{ n: number }>(
    "select count(*)::integer as n from public.messages where vid=$1 and sender='user'", [vid],
  )).rows[0]
  await db.query(
    `insert into public.evaluations(vid,expression,rapport) values($1,$2,$3)
     on conflict(vid) do update set expression=excluded.expression`,
    [vid, input.expression, input.starting],
  )
  const turns = c.turns - 1
  const reason = reasonAfterReply(turns, n, requestedEnd, input.respectedSpace)
  const final = (await db.query<Conversation>(
    "update public.conversations set turns=$3,completed=$4,end_reason=$5 where vid=$1 and uid=$2 returning *",
    [vid, owner, turns, reason !== null, reason],
  )).rows[0]
  return { ...state(final), expression: input.expression, user_message: user, persona_message: persona, pendingEvaluation: true }
}

export async function getLiveAssessmentReplay(db: LiveDb, owner: string, vid: string, turn: string, reply: string) {
  const c = await owned(db, owner, vid, true)
  const r = await receipt(db, vid, turn)
  if (!r || r.reply_id !== reply) throw new LiveChatError("Turn not found.", 404)
  if (!r.evaluated) return null
  const evaluation = (await db.query<Evaluation>("select * from public.evaluations where vid=$1", [vid])).rows[0] ?? null
  return { ...state(c), evaluation }
}

export async function recordLiveAssessment(db: LiveDb, input: {
  owner: string; vid: string; turn: string; reply: string; verdict: MidConversationEvaluation; starting: number; minimum: number
}) {
  const { owner, vid, turn, reply, verdict, starting, minimum } = input
  let c = await owned(db, owner, vid, true)
  const r = await receipt(db, vid, turn)
  if (!r || r.reply_id !== reply) throw new LiveChatError("Turn not found.", 404)
  let evaluation = (await db.query<Evaluation>("select * from public.evaluations where vid=$1", [vid])).rows[0] ?? null
  if (r.evaluated) return { ...state(c), evaluation }

  await db.query("update public.messages set feedback=left($3,255),status=$4 where vid=$1 and mid=$2", [vid, turn, verdict.feedback, verdict.status])
  const newer = (await db.query(
    "select 1 from public.visit_turns where vid=$1 and (submitted_at,id)>($2::timestamptz,$3::uuid) limit 1", [vid, r.submitted_at, turn],
  )).rows.length > 0
  if (!newer) {
    const rapport = Math.min(100, Math.max(0, (evaluation?.rapport ?? starting) + verdict.rapportChange))
    evaluation = (await db.query<Evaluation>(
      `insert into public.evaluations(vid,expression,sentiment,suggestion,rapport) values($1,$2,$3,$4,$5)
      on conflict(vid) do update set sentiment=excluded.sentiment,
      suggestion=excluded.suggestion,rapport=excluded.rapport returning *`,
      [vid, verdict.expression, verdict.sentiment, verdict.suggestion, rapport],
    )).rows[0]
    const { n } = (await db.query<{ n: number }>(
      "select count(*)::integer as n from public.messages where vid=$1 and sender='user'", [vid],
    )).rows[0]
    const reason = reasonAfterAssessment({scenario:c.scenario_name, userTurns:n, objectiveMet:verdict.objectiveMet === true, rapport, minimumRapport:minimum})
    if ((!c.completed && reason) || (reason === "objective_met" && !c.objective_met)) {
      c = (await db.query<Conversation>(
        `update public.conversations set completed=true,end_reason=case when completed then end_reason else $3 end,
        objective_met=objective_met or $4 where vid=$1 and uid=$2 returning *`,
        [vid, owner, reason, reason === "objective_met"],
      )).rows[0]
    }
  }
  await db.query("update public.visit_turns set evaluated=true where vid=$1 and id=$2", [vid, turn])
  return { ...state(c), evaluation }
}

export async function closeLiveVisit(db: LiveDb, owner: string, vid: string, early: boolean) {
  const c = await owned(db, owner, vid, true)
  if (c.completed) return c
  if (!early && c.turns > 0) throw new LiveChatError("This visit is still in progress.", 409)
  return (await db.query<Conversation>(
    "update public.conversations set completed=true,end_reason=$3 where uid=$1 and vid=$2 returning *",
    [owner, vid, early ? "ended_early" : "turn_limit"],
  )).rows[0]
}

export async function createLiveVisit(db: LiveDb, input: {
  owner: string; scenario: Conversation["scenario_name"]; difficulty: Conversation["difficulty"]; turns: number; context: string; opening: string; challenge?: string
}) {
  const { owner, scenario, difficulty, turns, context, opening } = input
  const inserted = (await db.query<Conversation>(
    `insert into public.conversations(uid,scenario_name,difficulty,turns,practice_context,challenge_id)
    values($1,$2,$3,$4,$5,$6)
    on conflict (uid,scenario_name,practice_context) where completed=false do nothing returning *`,
    [owner, scenario, difficulty, turns, context, input.challenge ?? null],
  )).rows[0]
  if (!inserted) return null
  const message = (await db.query<Message>(
    "insert into public.messages(vid,sender,content) values($1,'persona',$2) returning *", [inserted.vid, opening],
  )).rows[0]
  return { conversation: inserted, messages: [message], evaluation: null }
}

export async function saveLiveReport(db: LiveDb, input: {
  owner: string; vid: string; feedback: string; objectiveMet: boolean; scores: Score[]
}) {
  const { owner, vid, feedback, objectiveMet, scores } = input
  const c = await owned(db, owner, vid, true)
  const stored = (await db.query<StoredScore>("select * from public.scores where vid=$1", [vid])).rows
  if (stored.length) return { ...c, scores: stored }
  const final = (await db.query<Conversation>(
    `update public.conversations set feedback=coalesce(nullif($3,''),feedback),objective_met=(objective_met or $4)
    where vid=$1 and uid=$2 and completed returning *`,
    [vid, owner, feedback, objectiveMet],
  )).rows[0]
  if (!final) throw new LiveChatError("This visit is still in progress.", 409)
  const saved: StoredScore[] = []
  for (const score of scores) {
    const result = (await db.query<StoredScore>(
      `insert into public.scores(vid,metric_name,metric_value) values($1,$2,$3)
      on conflict(vid,metric_name) do update set metric_value=excluded.metric_value returning *`,
      [vid, score.name, score.value],
    )).rows[0]
    saved.push(result)
  }
  return { ...final, scores: saved }
}
