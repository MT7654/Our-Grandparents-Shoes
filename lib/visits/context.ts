import { createClient } from "@/lib/neon/data"
import type { ScenarioKeys, Difficulty } from "@/lib/types/types"
import { sceneFor } from "./scenes"
import { getMessages } from "@/lib/chat/message"

export async function practiceContext(
  raw: unknown,
  scenario: ScenarioKeys,
  uid: string
) {
  if (raw === undefined || raw === null || raw === "standalone")
    return { key: "standalone" }
  if (
    typeof raw !== "string" ||
    !/^(assignment|series):[0-9a-f-]{36}$/i.test(raw)
  )
    throw Error("Invalid practice context")
  const [kind, id] = raw.split(":")
  const db = await createClient()
  if (kind === "assignment") {
    const { data } = await db
      .from("visit_assignments")
      .select("difficulty,challenge_id,scenarios,visit_recipients!inner(uid)")
      .eq("id", id)
      .eq("visit_recipients.uid", uid)
      .maybeSingle()
    if (!data?.scenarios.includes(scenario))
      throw Error("Assignment unavailable")
    return { key: raw, challenge: data.challenge_id, difficulty: data.difficulty as Difficulty }
  }
  const { data } = await db
    .from("conversations")
    .select("scenario_name")
    .eq("vid", id)
    .eq("uid", uid)
    .eq("completed", true)
    .maybeSingle()
  if (!data) throw Error("Previous visit unavailable")
  const messages = await getMessages(id)
  const scene = sceneFor(data.scenario_name, messages)
  const remembered = scene?.visit.choices.find((c) =>
    messages.some((m) => m.sender === "persona" && m.content === c.reply)
  )
  const callback =
    remembered?.label === "Would another time suit you better?" &&
    scenario === "House Visit"
      ? "“You came back as we agreed. Thank you for remembering.”"
      : undefined
  return { key: raw, callback }
}
