import { identity } from "@/lib/neon/auth"
import { NextResponse } from "next/server"
export async function GET(){
 const user=await identity()
 return NextResponse.json({user},{status:user?200:401,headers:{"Cache-Control":"no-store"}})
}
