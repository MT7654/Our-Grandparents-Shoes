import {chromium} from "@playwright/test"
import assert from "node:assert/strict"
import {createInterface} from "node:readline/promises"
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||chromium.executablePath()})
try{
 const page=await browser.newPage()
 const base=process.env.CB_TEST_ORIGIN||"http://localhost:3188"
 await page.goto(base+"/auth")
 await page.getByRole("button",{name:"Sign in as a volunteer"}).click()
 await page.getByRole("button",{name:"Restore an existing account"}).click()
 await page.getByLabel("Email",{exact:true}).fill(process.env.CB_TEST_EMAIL)
 await page.getByRole("button",{name:"Send verification code"}).click()
 try{await page.getByLabel("Verification code").waitFor({timeout:15000})}catch{throw Error("Recovery request failed: "+await page.getByRole("status").textContent())}
 console.log("Synthetic mailbox code requested")
 const reader=createInterface({input:process.stdin,output:process.stdout,terminal:false})
 const otp=await reader.question("");reader.close()
 await page.getByLabel("Verification code").fill(otp.trim())
 await page.getByLabel("New password").fill(process.env.CB_TEST_PASSWORD)
 await page.getByRole("button",{name:"Set password and sign in"}).click()
 try{await page.waitForURL("**/scenarios",{timeout:20000})}catch{throw Error("Recovery confirmation failed: "+await page.getByRole("status").textContent())}
 const session=await (await page.request.get(base+"/api/auth/session")).json()
 assert.equal(session.user.id,process.env.CB_TEST_UID)
 const {messages}=await (await page.request.get(base+"/api/dashboard/chat?vid="+process.env.CB_TEST_VID)).json()
 assert.equal(messages[0].content,"Synthetic historical transcript for account recovery.")
 await page.reload()
 assert.equal((await page.request.get(base+"/api/auth/session")).status(),200)
 console.log("Real Neon OTP recovery, original UUID, historical transcript and session restoration passed.")
}finally{await browser.close()}
