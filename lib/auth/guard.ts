import { identity } from "@/lib/neon/auth"
import { NextResponse } from "next/server"
export async function guard(role:"user"|"admin"){
 const user=await identity()
 if(!user)return NextResponse.json({error:"Sign in and verify your email"},{status:401})
 if(user.role!==role)return NextResponse.json({error:"Forbidden"},{status:403})
 return {session:{user},profile:user}
}
