import {auth} from "@/lib/neon/auth"
import {NextResponse} from "next/server"
export async function POST(){await auth().signOut();return NextResponse.json({success:true})}
