import { NextRequest,NextResponse } from "next/server"
import {identity} from "@/lib/neon/auth"
export async function proxy(req:NextRequest){
 const user=await identity()
 if(!user)return NextResponse.redirect(new URL("/auth",req.url))
 const admin=req.nextUrl.pathname.startsWith("/admin")
 if(admin !== (user.role==="admin"))return NextResponse.redirect(new URL(user.role==="admin"?"/admin":"/scenarios",req.url))
 return NextResponse.next()
}
export const config={matcher:["/admin/:path*","/chat/:path*","/complete/:path*","/dashboard/:path*","/scenarios/:path*"]}
