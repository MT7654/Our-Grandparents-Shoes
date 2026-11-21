import { PGlite } from "@electric-sql/pglite"
import { build } from "esbuild"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
const compiled = await build({
  entryPoints: ["lib/chat/live-persistence.ts"],
  bundle: true, platform: "node", format: "esm", write: false,
})
const live = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"))
const rules = await import("../lib/chat/live-rules.ts")
assert.equal(rules.bookingStillPlanned("I’ll pick Tuesday at 2 pm and confirm the booking."), true)
assert.equal(rules.bookingStillPlanned("I’ve booked Tuesday at 2 pm. I’ll pick a bus later."), false)
assert.equal(rules.bookingStillPlanned("The app says to call the clinic. I’ll call after lunch."), false)
assert.equal(rules.acceptsVisitEnding("Shall we leave the radio there?", "Yes, let's leave it for now.", true), false)
assert.equal(rules.acceptsVisitEnding("Of course, take care.", "Thank you, bye.", false), true)
assert.equal(rules.acceptsVisitEnding("Would you like some company?", "I need some time alone.", true), true)
const gaveSpace = rules.respectedRequestForSpace("Today I need time alone.", "Of course, I’ll leave you to rest.", "Thank you.")
assert.equal(rules.reasonAfterReply(19, 1, false, gaveSpace), "boundary")
assert.equal(rules.respectedRequestForSpace("My radio is noisy.", "I’ll leave it here.", "Okay."), false)
const { challenges, getChallenge, mastery } = await import("../lib/visits/challenges.ts")
assert.equal(new Set(challenges.map(skill => skill.id)).size, 12)
assert.equal(getChallenge("privacy", "House Visit"), undefined)
for (const skill of challenges) assert.ok(readFileSync("public" + skill.image).length > 0)
const stamp = (date, difficulty, opening, state = "Demonstrated") => ({
  started_at: date, difficulty, opening, skill_report: { state }
})
const easy = stamp("2026-11-20", "Easy", "At the door")
assert.equal(mastery([easy, stamp("2026-11-21", "Hard", "At the door")]), "Demonstrated")
assert.equal(mastery([easy, stamp("2026-11-21", "Hard", "The radio", "Practised")]), "Demonstrated")
assert.equal(mastery([stamp("2026-11-22", "Hard", "The radio"), easy]), "Repeated independently")
assert.equal(mastery([stamp("2026-11-18", "Hard", "The radio"), easy]), "Demonstrated")
for (const scenario of ["House Visit", "Emotional Listening Ear"]) {
  for (const userTurns of [3, 4, 7, 9]) {
    assert.equal(rules.reasonAfterAssessment({ scenario, userTurns, objectiveMet: true, rapport: 95, minimumRapport: 10 }), null)
  }
}
const db = new PGlite()
const tx = work => db.transaction(work)
const user = crypto.randomUUID()
const other = crypto.randomUUID()
const scenario = "House Visit"
const cases = [
  ["Easy", "turn_limit"],
  ["Hard", "objective_met"],
  ["Hard", "boundary"],
]
const assessment = {
  expression: "neutral", sentiment: "positive", rapportChange: 5,
  suggestion: "Agree on a practical next step.",
  feedback: "Continue to follow up.", status: "good",
}
try {
  await db.exec(`create schema auth;create role anon;create role authenticated;create role supabase_auth_admin;create role service_role;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);`)
  for (const file of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync("supabase/migrations/" + file, "utf8"))
  await db.exec(readFileSync("supabase/seeds/001.badges.sql", "utf8"))
  await db.query("insert into auth.users(id) values($1),($2)", [user, other])
  const prior = (await db.query(
    "insert into conversations(uid,scenario_name,turns,completed,objective_met) values($1,'House Visit',8,true,true) returning vid", [user],
  )).rows[0].vid
  await db.exec(readFileSync("db/migrations/20261120143000_live_practice_end_reason.sql", "utf8"))
  await db.exec(readFileSync("db/migrations/20261121000100_challenge_journal.sql", "utf8"))
  assert.deepEqual((await db.query("select completed,objective_met,end_reason from conversations where vid=$1", [prior])).rows[0], {completed:true, objective_met:true, end_reason:null})
  for (const [difficulty, wanted] of cases) {
    const fresh = {owner:user, scenario:wanted === "objective_met" ? "Resolve a Task" : scenario, difficulty, turns:wanted==="turn_limit" ? 3 : 10, context:"test:"+wanted, opening:"Starting a visit."}
    const visit = await tx(d => live.createLiveVisit(d, fresh))
    assert.equal(await tx(d => live.createLiveVisit(d, fresh)), null)
    const vid = visit.conversation.vid
    let previous = visit.messages[0].mid
    let last, input
    for (const [index, text] of [
      "Hello, I'm your volunteer. Is now a good time?",
      "I came to check your shopping list.",
      "I'll collect the list if you're happy for me to, and return tomorrow.",
    ].entries()) {
      input = {
        owner:user,vid, turn:crypto.randomUUID(), previous, text,
        expression: "angry", starting: 0,
        reply: `Margaret responds naturally to your reply number ${index + 1}.`,
        requestedEnd:index === 1 || wanted === "boundary" && index === 2,
      }
      await assert.rejects(tx(d => live.getLiveReplay(d, other, vid, input.turn, text)), {status:404})
      await assert.rejects(tx(d => live.commitLiveReply(d, {...input,previous:crypto.randomUUID()})), {status:409})
      last = await tx(d => live.commitLiveReply(d, input))
      assert.equal(last.objective_met, false)
      assert.deepEqual(await tx(d => live.getLiveReplay(d, user, vid, input.turn, text)), last)
      assert.deepEqual(await tx(d => live.commitLiveReply(d, input)), last)
      await assert.rejects(tx(d => live.getLiveReplay(d, user, vid, input.turn, "Changed text")), {status:409})
      const check = {
        owner:user, vid, turn:input.turn, reply:last.persona_message.mid, verdict:{...assessment, objectiveMet:true}, starting:0, minimum:0,
      }
      await assert.rejects(tx(d => live.recordLiveAssessment(d, {...check,owner:other})), {status:404})
      const after = await tx(d => live.recordLiveAssessment(d, check))
      assert.equal(after.evaluation.expression, "angry")
      assert.deepEqual(await tx(d => live.recordLiveAssessment(d, check)), after)
      if (index < 2) {
        assert.equal(last.completed, false)
        assert.equal(after.completed, false)
        assert.equal(after.objective_met, false)
        assert.equal(after.end_reason, null)
      } else {
        assert.equal(after.end_reason, wanted)
        assert.equal(after.completed, true)
        assert.equal(after.objective_met, wanted === "objective_met")
      }
      previous = last.persona_message.mid
    }
    assert.equal((await db.query("select count(*)::int as n from messages where vid=$1", [vid])).rows[0].n, 7)
    await assert.rejects(tx(d => live.getLiveReplay(d, user, vid, crypto.randomUUID(), "One more")), {status:409})
    const closed = await tx(d => live.closeLiveVisit(d, user, vid, true))
    assert.equal(closed.end_reason, wanted)
    const report = await tx(d => live.saveLiveReport(d, {owner:user, vid, feedback:"Assessment unavailable", objectiveMet:false, scores:[]}))
    assert.equal(report.end_reason, wanted)
    assert.equal(report.objective_met, wanted === "objective_met")
    assert.equal(report.scores.length,0)
  }
  const active = await tx(d => live.createLiveVisit(d, {owner:user, scenario, difficulty:"Easy", turns:10, context:"test:early", opening:"Starting."}))
  await assert.rejects(tx(d => live.closeLiveVisit(d, user, active.conversation.vid, false)), {status:409})
  const early = await tx(d => live.closeLiveVisit(d, user, active.conversation.vid, true))
  assert.equal(early.end_reason, "ended_early")
  assert.equal(early.objective_met,false)
  const straggler = await tx(d => live.createLiveVisit(d, {owner:user, scenario, difficulty:"Easy", turns:0, context:"test:exhausted", opening:"Starting."}))
  assert.equal((await tx(d => live.closeLiveVisit(d, user, straggler.conversation.vid, false))).end_reason, "turn_limit")
  console.log("Live practice: Easy and Hard sustain two old suggestions; atomic turn idempotency, owner isolation, legacy preservation, objective/boundary/turn-budget/user closure, and report fallback passed.")
} finally {
  await db.close()
}
