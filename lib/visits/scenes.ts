export interface Choice {
  label: string
  intent: RegExp
  reply: string
}
export interface Visit {
  scenario: string
  opening: string
  greeting: Choice
  choices: Choice[]
}
const choice = (label: string, intent: RegExp, reply: string): Choice => ({
  label,
  intent,
  reply
})
const task = (cards: boolean): Visit => ({
  scenario: "Resolve a Task",
  opening: cards
    ? "Margaret is sorting recipe cards beside a tin. “Now, where shall I put the ones I bake every week?”"
    : "Margaret is folding paper at the table. Beside her are seeds, a pencil and three half-filled packets.",
  greeting: choice(
    "Would you like a hand?",
    /would you like|can i help|may i help/i,
    "“Please leave that part to me, dear. I have my own way.” She keeps her hand on the table."
  ),
  choices: [
    choice(
      "Could you show me how?",
      /show me|demonstrate/i,
      cards
        ? "“Everyday recipes at the front.” She slides a divider behind the pineapple tarts. “You can put the buns just here.”"
        : "She folds the top twice. “Like that, so the seeds stay dry. Could you write basil on this one?”"
    ),
    choice(
      "Shall I just pass you what you need?",
      /pass you|smaller|hand you/i,
      cards
        ? "“Just pass me the tin, please. I'll put them in my own order.”"
        : "“Just the pencil, please. I'd like to label these myself.”"
    ),
    choice(
      "I'll leave it with you.",
      /leave it|step back|yourself/i,
      "“Thank you, dear. I'll finish when I'm ready.” She draws her work closer."
    )
  ]
})
export const visits: Visit[] = [
  {
    scenario: "House Visit",
    opening:
      "At the doorway Margaret looks up from mending a sleeve. A chair is tucked under the table. “Hello, dear?”",
    greeting: choice(
      "Hello, I'm your volunteer. Is now a good time?",
      /good time|your volunteer|okay to visit/i,
      "“I've only got a few minutes. What did you come by for?” She sets the sleeve on her knee."
    ),
    choices: [
      choice(
        "I'll keep it short. Do you need anything this week?",
        /keep it short|brief|anything this week/i,
        "“Just some thread on your next round, thank you.” She holds up the sleeve to show you the colour."
      ),
      choice(
        "Would another time suit you better?",
        /another time|come back|reschedule/i,
        "“Tomorrow afternoon would suit me.” She picks up the sleeve again."
      ),
      choice(
        "I came to check your shopping list.",
        /shopping list|check your list/i,
        "“It's by the door. Thank you for collecting it.” She returns to her stitching."
      )
    ]
  },
  {
    scenario: "Emotional Listening Ear",
    opening:
      "The radio plays quietly beside Margaret's chair. She turns her cup in her hands. “It's been a long morning.”",
    greeting: choice(
      "Would you like some company?",
      /company|sit with you|here for you/i,
      "“Sometimes the flat feels very quiet.” She looks towards the radio. A silence follows."
    ),
    choices: [
      choice(
        "Sit quietly with Margaret",
        /sit quietly|silence|sit in quiet/i,
        "She leaves the radio playing. After a while she says, “Stay for the end of this song with me.”"
      ),
      choice(
        "That sounds lonely. I'm here to listen.",
        /sounds lonely|here to listen|sounds hard/i,
        "“It is lonely sometimes. That's all I want to say today.” She leaves her chair close to yours."
      ),
      choice(
        "Shall we listen to the programme?",
        /programme|program|music|radio/i,
        "She turns up the radio. “This singer used to come on every Sunday.”"
      )
    ]
  },
  task(false),
  task(true)
]
export function sceneFor(
  scenario: string,
  history: { sender: string; content: string }[]
) {
  const visit = visits.find(
    (v) =>
      v.scenario === scenario &&
      history.some(
        (m) => m.sender === "persona" && m.content.split("\n")[0] === v.opening
      )
  )
  if (!visit) return null
  const replies = history
    .filter((m) => m.sender === "persona")
    .map((m) => m.content)
  const ended = visit.choices.some((c) => replies.includes(c.reply))
  const turning = replies.includes(visit.greeting.reply)
  const lastReply = replies.at(-1)
  const interrupted =
    lastReply &&
    !lastReply.startsWith(visit.opening) &&
    lastReply !== visit.greeting.reply
  const repair = choice(
    "Sorry, let me check what you prefer.",
    /sorry|my mistake|what you prefer/i,
    visit.greeting.reply
  )
  const choices = ended
    ? []
    : interrupted
      ? [repair, ...(turning ? visit.choices.slice(0, 2) : [visit.greeting])]
      : turning
        ? visit.choices
        : [visit.greeting]
  return { visit, ended, choices }
}
export function resolveChoice(choices: Choice[], text: string) {
  const matches = choices.filter(
    (c) =>
      c.label.toLowerCase() === text.trim().toLowerCase() || c.intent.test(text)
  )
  return matches.length === 1 && !/\b(?:not|don't|never)\b/i.test(text)
    ? matches[0]
    : undefined
}
