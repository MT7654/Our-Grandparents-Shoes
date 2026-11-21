import type { PoolClient } from "pg"

const clock = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "medium",
})

export async function volunteerHistory(db: Pick<PoolClient, "query">, uid: string) {
  const { rows } = await db.query(
    `select p.full_name, c.vid, c.scenario_name, c.difficulty, c.completed, c.created_at,
            m.mid, m.sent_at, m.sender, m.content
     from public.profiles p
     left join public.conversations c on c.uid = p.user_id
     left join public.messages m on m.vid = c.vid
     where p.user_id = $1 and p.role = 'user'
     order by c.created_at, c.vid, m.sent_at, m.mid`, [uid],
  )
  if (!rows.length) return null
  const name = rows[0].full_name || "Volunteer"
  const lines = [`Conversation history — ${name}`, "All times are Singapore time (UTC+8)."]
  let previous: string | null = null
  for (const row of rows) {
    if (!row.vid) {
      lines.push("", "No recorded sessions.")
      break
    }
    if (row.vid !== previous) {
      previous = row.vid
      lines.push("", `${row.scenario_name} · ${row.difficulty} · ${row.completed ? "Completed" : "Incomplete"}`,
        `Started ${clock.format(new Date(row.created_at))}`, "")
    }
    if (row.mid) {
      const speaker = row.sender === "user" ? "Volunteer" : "Margaret"
      lines.push(`[${clock.format(new Date(row.sent_at))}] ${speaker}: ${row.content}`)
    } else {
      lines.push("No recorded messages.")
    }
  }
  return lines.join("\r\n") + "\r\n"
}
