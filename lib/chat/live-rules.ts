export type EndReason = "objective_met" | "boundary" | "turn_limit" | "ended_early"

// The live exercise must allow an opening, a response, and a meaningful follow-up.
// No suggested phrase, canned response, or general positivity completes it.
export const practiceExchanges = 3

export function reasonAfterReply(turnsRemaining: number, userTurns: number, requestedEnd: boolean): EndReason | null {
  if (requestedEnd && userTurns >= practiceExchanges) return "boundary"
  return turnsRemaining <= 0 ? "turn_limit" : null
}

export function reasonAfterAssessment(input: {
  userTurns: number
  objectiveMet: boolean
  rapport: number
  minimumRapport: number
}): EndReason | null {
  if (input.userTurns < practiceExchanges) return null
  if (input.objectiveMet) return "objective_met"
  if (input.rapport < input.minimumRapport) return "boundary"
  return null
}

export const objectiveCriteria: Record<string, string> = {
  "House Visit": "The volunteer establishes whether now is a good time, agrees on the purpose, and follows through on a practical next step or respectful deferral that Margaret acknowledges. A greeting or a request by itself is insufficient.",
  "Emotional Listening Ear": "The volunteer notices what Margaret has shared, responds with specific validation, then follows her lead in a meaningful follow-up or deliberate silence. Margaret's reply should support that she felt heard or accepted the space. Merely saying 'I'm here to listen' does not establish this.",
  "Resolve a Task": "Margaret explicitly confirms that the volunteer helped her finish the immediate practical task or that she can now do the specific next step independently. Offering help or stating instructions alone does not count.",
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
}
