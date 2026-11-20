export const chapters = [
  "House Visit",
  "Emotional Listening Ear",
  "Resolve a Task",
] as const
export const chapterBadges = [
  "Considerate Visitor",
  "Attentive Listener",
  "Patient Guide",
]
const catalogue = [
  [
    "door",
    "Ask at the door",
    "Explain why you came and honour her answer about timing.",
    "Is there time for a short visit?",
    "Who is it? I’m in the middle of cooking.",
  ],
  [
    "notice",
    "Find out what matters today",
    "Follow up on one particular detail she offers.",
    "Just boiled water. This kettle quite noisy these days.",
    "I’m fine. That radio keeps cutting out though.",
  ],
  [
    "choice",
    "Let Margaret choose",
    "Ask before acting and respect how much help she wants.",
    "My radio sounds funny today. Can hear it from there?",
    "The radio again. Just listen can? Leave it there.",
  ],
  [
    "close",
    "Agree how to leave things",
    "Agree on an action, a deferral or leaving things as they are.",
    "I have a few minutes before my daughter comes.",
    "Only a minute today. I need to go out soon.",
  ],
  [
    "worry",
    "Hear the worry",
    "Respond to her specific worry and leave room for correction.",
    "Couldn’t find my keys again this morning.",
    "Keys went missing again. Small thing lah.",
  ],
  [
    "listen",
    "Listen before offering a fix",
    "Acknowledge her experience and check what support she wants.",
    "My girl called today, but so rushed.",
    "Everyone says my daughter should call more. They don’t understand.",
  ],
  [
    "repair",
    "Recover from a misunderstanding",
    "Acknowledge the misunderstanding and follow her correction.",
    "People think I’m angry. Actually I just miss her.",
    "Last visitor thought I wanted advice. That wasn’t what I meant.",
  ],
  [
    "space",
    "Respect quiet or space",
    "Distinguish quiet company from wanting to be alone.",
    "Can sit with me awhile? No need talk so much.",
    "Thank you for coming. Today I think I need some time alone.",
  ],
  [
    "privacy",
    "Keep sign-in private",
    "Let her handle Singpass herself and keep passwords and codes private.",
    "I got my Healthier SG letter. Must log in myself ah?",
    "Want me to tell you my Singpass password so you can help me enrol?",
  ],
  [
    "screen",
    "Guide one screen at a time",
    "Ask what she sees, guide a specific action, then check the next screen.",
    "Got the invitation. My HealthHub screen shows so many things.",
    "HealthHub open already. My screen looks different from my sister’s.",
  ],
  [
    "clinic",
    "Leave the clinic choice with her",
    "Help her identify her preferred clinic or agree to check later.",
    "Got the invitation. Can enrol with my usual clinic?",
    "I want to enrol but I don’t remember the name of my clinic.",
  ],
  [
    "booking",
    "Check what was actually booked",
    "Distinguish enrolment from a confirmed booking or a pending clinic contact.",
    "The letter says first Health Plan visit. How do I book?",
    "My neighbour said once enrolled, appointment already booked. Really?",
  ],
]
export const challenges = catalogue.map(
  ([id, title, cue, easy, hard], index) => ({
    id,
    title,
    cue,
    easy,
    hard,
    index,
    scenario: chapters[Math.floor(index / 4)],
    image: "/journal/stamp-" + id + ".webp",
  }),
)
export function chapterImage(name: string) {
  return (
    "/journal/chapter-" +
    Math.max(
      0,
      chapters.findIndex((chapter) => chapter === name),
    ) +
    ".webp"
  )
}
export function getChallenge(id: unknown, scenario?: string) {
  return challenges.find(
    (c) => c.id === id && (!scenario || c.scenario === scenario),
  )
}
export type SkillReport = {
  state: "Practised" | "Demonstrated" | "No opportunity this visit"
  note: string
  volunteer: string
  margaret: string
  turn: number
}
export type SkillVisit = {
  vid: string
  challenge_id: string
  difficulty: string
  opening: string
  started_at: string
  skill_report: SkillReport | null
  skill_flag: boolean
}
export function mastery(visits: SkillVisit[]) {
  const openings = new Set<string>()
  for (const visit of [...visits].sort((a, b) =>
    a.started_at.localeCompare(b.started_at),
  )) {
    if (visit.skill_report?.state !== "Demonstrated") continue
    if (
      visit.difficulty === "Hard" &&
      [...openings].some((o) => o !== visit.opening)
    )
      return "Repeated independently"
    openings.add(visit.opening)
  }
  return openings.size
    ? "Demonstrated"
    : visits.some((v) => v.skill_report?.state === "Practised")
      ? "Practised"
      : (visits[0]?.skill_report?.state ??
        (visits.length ? "Awaiting review" : "To try"))
}
