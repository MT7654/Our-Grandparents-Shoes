import { auth } from "@/lib/neon/auth"
import { betaRequest } from "@/lib/beta/runtime"

export function POST(request: Request) {
  return betaRequest(request, "login", async () => {
    const result = await auth().signOut()
    if (result.error) throw Error("Unable to end prior session")
  })
}
