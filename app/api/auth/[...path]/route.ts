import { auth } from "@/lib/neon/auth"
import type {NextRequest} from "next/server"
type Context={params:Promise<{path:string[]}>}
export const GET=(req:NextRequest,ctx:Context)=>auth().handler().GET(req,ctx)
export const POST=(req:NextRequest,ctx:Context)=>auth().handler().POST(req,ctx)
