import { auth } from "@/lib/neon/auth"
import { NextResponse } from "next/server"
export async function POST(request:Request){
 const {email,password,metadata}=await request.json()
 if(typeof email!=="string"||typeof password!=="string")return NextResponse.json({error:"Email and password required"},{status:400})
 const result=await auth().signIn.email({email,password})
 return NextResponse.json(result.error?{error:result.error.message}:{user:result.data?.user},{status:result.error?400:200})
}
