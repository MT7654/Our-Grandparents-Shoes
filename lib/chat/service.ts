import { transaction } from "@/lib/neon/pool"
import { getChallenge, alternateHardOpenings } from "../visits/challenges"
import { sceneFor } from "../visits/scenes"
import {
  getConversationByConversationID,
  getExistingConversationByScenario,
  getUserConversations,
} from "./conversation"
import { getEvaluation, saveEvaluation } from "./evaluation"
import { getMessages, savePersonaMessage, saveUserMessage } from "./message"
import { getScores } from "./score"
import { evaluateCompletion } from "@/lib/llm/completion"
import { generateLiveReply } from "../llm/chat"
import { evaluateResponse } from "../llm/evaluate"
import type { Database } from "@/supabase/types"
import type { EndConversationEvaluation, ScenarioKeys } from "@/lib/types/types"
import scenarios from "../scenarios.json"
import personas from "../personas.json"
import { objectiveCriteria, practiceExchanges, respectedRequestForSpace } from "./live-rules"
import { followUpHints, houseGreeting } from "./hints"
import {
  closeLiveVisit,
  commitLiveReply,
  createLiveVisit,
  getLiveAssessmentReplay,
  getLiveReplay,
  LiveChatError,
  recordLiveAssessment,
  saveLiveReport,
} from "./live-persistence"

type Conversation = Database["public"]["Tables"]["conversations"]["Row"]

export { getUserConversations, saveUserMessage, savePersonaMessage, saveEvaluation }

function setup(scenarioName: ScenarioKeys) {
  const scenario = scenarios[scenarioName]
  return { scenario, persona: personas[scenario.persona as keyof typeof personas] }
}

export async function resumeConversation(owner: string, scenarioName: ScenarioKeys, context = "standalone") {
  const active = await getExistingConversationByScenario(scenarioName, context)
  if (!active) return null
  if (active.uid !== owner) throw new LiveChatError("Visit not found.", 404)
  if (active.turns <= 0) await transaction(null, db => closeLiveVisit(db, owner, active.vid, false))
  return { ...setup(scenarioName), ...await fetchFullConversation(active.vid) }
}

export async function startConversation(
  owner: string,
  scenarioName: ScenarioKeys,
  difficulty: Conversation["difficulty"],
  context = "standalone",
  callback?: string,
  focus?: string,
) {
  const { scenario, persona } = setup(scenarioName)
  const existing = await resumeConversation(owner, scenarioName, context)
  if (existing) return existing
  const openings = scenario.starting_messages
  const challenge = getChallenge(focus, scenarioName)
  let opening = challenge ? (difficulty === "Easy" ? challenge.easy : challenge.hard) : openings[Math.floor(Math.random() * openings.length)]
  if (challenge && difficulty === "Hard") {
    const previous = await transaction(owner, async db => (await db.query("select (select content from messages m where m.vid=c.vid order by sent_at,mid limit 1) as opening from conversations c where uid=$1 and challenge_id=$2 and completed order by created_at desc limit 1",[owner,challenge.id])).rows[0])
    if (previous?.opening?.split("\n")[0] === opening) opening = alternateHardOpenings[challenge.index]
  }
  const { min_turns, max_turns } = scenario.constraints
  const turns = min_turns + Math.floor(Math.random() * (max_turns - min_turns + 1))
  const created = await transaction(null, db => createLiveVisit(db, {
    owner, scenario: scenarioName, difficulty, turns, context, challenge: challenge?.id,
    opening: callback ? opening + "\n" + callback : opening,
  }))
  if (created) return { scenario, persona, ...created }
  // Another tab may have created the same active visit while this request was in flight.
  const raced = await resumeConversation(owner, scenarioName, context)
  if (!raced) throw new LiveChatError("Please reopen the visit to continue.", 409)
  return raced
}

export async function endConversation(converseID: string, endEarly: boolean, owner: string) {
  // Record that the visit ended even if the assessment provider is unavailable.
  const closed = await transaction(null, db => closeLiveVisit(db, owner, converseID, endEarly))
  const [scores, messages] = await Promise.all([getScores(converseID), getMessages(converseID)])
  if (scores.length) return { ...closed, scores }
  const name = closed.scenario_name
  const { scenario } = setup(name)
  const userTurns = messages.filter(m => m.sender === "user").length
  const scene = sceneFor(name, messages)
  const examples = new Set([houseGreeting, ...(followUpHints[name] ?? []), ...(scene ? [scene.visit.greeting.label, ...scene.visit.choices.map(c => c.label)] : [])])
  const hasOwnReply = messages.some(m => m.sender === "user" && !examples.has(m.content.trim()))
  let evaluation: EndConversationEvaluation | null = null
  if (userTurns > 0) {
    try {
      evaluation = await evaluateCompletion(messages, name === "Resolve a Task" && sceneFor(name, messages) ? "Guide Margaret through the practical task in her opening, with her agreement." : scenario.objective + "\n" + objectiveCriteria[name])
    } catch {
      // A report failure must not reopen the visit, erase the saved outcome, or invent scores.
    }
  }
  return transaction(null, db => saveLiveReport(db, {
    owner, vid: converseID,
    // Legacy guided results retain their previously persisted objective flags.
    objectiveMet: name !== "Resolve a Task" && closed.end_reason !== null && hasOwnReply &&
      userTurns >= practiceExchanges && evaluation?.objective_met === true &&
      (closed.end_reason === "turn_limit" || evaluation.completed === true),
    feedback: evaluation?.feedback?.trim() || closed.feedback || (userTurns > 0 ? "Assessment unavailable" : "No replies to assess."),
    scores: evaluation?.scores ?? [],
  }))
}

export async function fetchFullConversation(converseID: string) {
  const [conversation, evaluation, messages] = await Promise.all([
    getConversationByConversationID(converseID),
    getEvaluation(converseID),
    getMessages(converseID),
  ])
  return { conversation, messages, evaluation }
}

export async function fetchCompleteConversation(converseID: string) {
  const [conversation, scores] = await Promise.all([
    getConversationByConversationID(converseID),
    getScores(converseID),
  ])
  if (!conversation?.completed) return null
  const objective = scenarios[conversation.scenario_name].objective
  if (!scores.length) return { ...conversation, scores: {}, average: null, objective }
  const total = scores.reduce((acc, s) => acc + s.metric_value, 0)
  return {
    ...conversation,
    scores: Object.fromEntries(scores.map(s => [s.metric_name, s.metric_value])),
    average: Math.floor(total / scores.length),
    objective,
  }
}

export async function converseReply(converseID: string, text: string, turnId: string, owner: string) {
  const replay = await transaction(null, db => getLiveReplay(db, owner, converseID, turnId, text))
  if (replay) return replay
  const { conversation, messages } = await fetchFullConversation(converseID)
  const previous = messages.at(-1)?.mid
  if (!conversation || conversation.uid !== owner || !previous) throw new LiveChatError("Visit not found.", 404)
  const { scenario, persona } = setup(conversation.scenario_name)
  if (text.length > scenario.constraints.character_limit) throw new LiveChatError("Your reply is too long.", 400)
  // Suggested replies and typed replies deliberately take the same live model path.
  const result = await generateLiveReply(conversation.scenario_name, conversation.difficulty, persona, messages, text)
  return transaction(null, db => commitLiveReply(db, {
    owner, vid: converseID, turn: turnId, previous, text,
    expression: result.expression, starting: scenario.constraints.starting_score,
    reply: result.text, requestedEnd: result.requestedEnd,
    respectedSpace: respectedRequestForSpace(messages.at(-1)?.content ?? "", text, result.text),
  }))
}

export async function converseEvaluate(converseID: string, userMessageId: string, personaMessageId: string, owner: string) {
  const replay = await transaction(null, db => getLiveAssessmentReplay(db, owner, converseID, userMessageId, personaMessageId))
  if (replay) return replay
  const { conversation, evaluation, messages } = await fetchFullConversation(converseID)
  if (!conversation || conversation.uid !== owner) throw new LiveChatError("Visit not found.", 404)
  const userIndex = messages.findIndex(m => m.mid === userMessageId && m.sender === "user")
  const reply = messages.find(m => m.mid === personaMessageId && m.sender === "persona")
  if (userIndex < 0 || !reply) throw new LiveChatError("Turn not found.", 404)
  const { scenario, persona } = setup(conversation.scenario_name)
  const verdict = await evaluateResponse(
    conversation.scenario_name, persona, messages[userIndex].content, messages.slice(0, userIndex),
    evaluation, conversation.difficulty, scenario.objective, 0.3, 2048, reply.content,
  )
  return transaction(null, db => recordLiveAssessment(db, {
    owner, vid: converseID, turn: userMessageId, reply: personaMessageId, verdict,
    starting: scenario.constraints.starting_score, minimum: scenario.constraints.score_bottom_limit,
  }))
}
