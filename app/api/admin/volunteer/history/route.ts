import { guard } from "@/lib/auth/guard"
import { volunteerHistory } from "@/lib/admin/volunteer-history"
import { isUuid } from "@/lib/chat/live-rules"
import { transaction } from "@/lib/neon/pool"

export async function GET(request: Request) {
  const access = await guard("admin")
  if (access instanceof Response) return access
  const uid = new URL(request.url).searchParams.get("uid")
  if (!isUuid(uid)) return new Response("Invalid volunteer ID", { status: 400 })
  const history = await transaction(null, db => volunteerHistory(db, uid))
  if (history === null) return new Response("Volunteer not found", { status: 404 })
  return new Response(history, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Disposition": `attachment; filename="conversation-history-${uid}.txt"`,
    "Cache-Control": "private, no-store",
  } })
}
