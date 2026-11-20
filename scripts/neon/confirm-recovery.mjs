import {chromium} from "@playwright/test"
import assert from "node:assert/strict"
import {createInterface} from "node:readline/promises"
const rl=createInterface({input:process.stdin,terminal:false})
const [otp]=await Array.fromAsync(rl)
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH})
try{
 const ctx=await browser.newContext()
 const base="http://localhost:3188"
 const email=process.env.CB_TEST_EMAIL,password=process.env.CB_TEST_PASSWORD
 const headers={origin:base}
 const reset=await ctx.request.post(base+"/api/auth/email-otp/reset-password",{headers,data:{email,password,otp:otp.trim()}})
 if(!reset.ok())throw Error("Recovery failed: "+(await reset.json()).message)
 const login=await ctx.request.post(base+"/api/auth/sign-in/email",{headers,data:{email,password}})
 assert.equal(login.ok(),true,"Verified account sign-in")
 const session=await (await ctx.request.get(base+"/api/auth/session")).json()
 assert.equal(session.user.id,process.env.CB_TEST_UID)
 const {messages}=await (await ctx.request.get(base+"/api/dashboard/chat?vid="+process.env.CB_TEST_VID)).json()
 assert.equal(messages[0].content,"Synthetic historical transcript for account recovery.")
 const page=await ctx.newPage()
 await page.goto(base+"/scenarios");await page.reload()
 await page.getByText("Listening Ear",{exact:true}).first().waitFor()
 console.log("Verified email reset, sign-in, original UUID, original transcript and session restoration.")
}finally{await browser.close()}
