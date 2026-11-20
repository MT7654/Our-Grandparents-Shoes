export type EndReason = "objective_met" | "boundary" | "turn_limit" | "ended_early"

// The live exercise must allow an opening, a response, and a meaningful follow-up.
// No suggested phrase, canned response, or general positivity completes it.
export const practiceExchanges = 3

export function acceptsVisitEnding(volunteer: string, margaret: string, marked: boolean) {
  const farewell = /\b(?:goodbye|bye(?:-bye)?|take care|see you (?:next time|soon|later))\b/i
  if (farewell.test(volunteer) && farewell.test(margaret) && !margaret.includes("?")) return true
  if (!marked) return false
  // Leaving a radio alone or a booking pending is different from ending the visit.
  return farewell.test(margaret) || /\b(?:come back|visit another|another day|please go|you can go|leave me|be alone|time alone|some space|sit quietly|quiet company|need to (?:go|rest)|need a rest|must go|end (?:the|this) visit)\b/i.test(margaret)
}

export function reasonAfterReply(turnsRemaining: number, userTurns: number, requestedEnd: boolean): EndReason | null {
  if (requestedEnd && userTurns >= practiceExchanges) return "boundary"
  return turnsRemaining <= 0 ? "turn_limit" : null
}

export function reasonAfterAssessment(input: {
  scenario: string
  userTurns: number
  objectiveMet: boolean
  rapport: number
  minimumRapport: number
}): EndReason | null {
  if (input.userTurns < practiceExchanges) return null
  if (input.scenario === "Resolve a Task" && input.objectiveMet) return "objective_met"
  if (input.rapport < input.minimumRapport) return "boundary"
  return null
}

export const objectiveCriteria: Record<string, string> = {
  "House Visit": "The volunteer establishes whether now is a good time, agrees on the purpose, and follows through on a practical next step or respectful deferral that Margaret acknowledges. A greeting or a request by itself is insufficient.",
  "Emotional Listening Ear": "The volunteer notices what Margaret has shared, responds with specific validation, then follows her lead in a meaningful follow-up or deliberate silence. Margaret's reply should support that she felt heard or accepted the space. Merely saying 'I'm here to listen' does not establish this.",
  "Resolve a Task": "The volunteer guides Margaret through all six Healthier SG steps: sign in to HealthHub using her own Singpass, start enrolment, select her own profile, choose her preferred clinic, confirm enrolment, and arrange the first Health Plan consultation. Check each step against the volunteer’s words and Margaret’s progress. An intermediate tap, simple reassurance or an uncorrected wrong instruction is insufficient.",
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
}
