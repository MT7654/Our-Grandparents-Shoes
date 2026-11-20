import assert from "node:assert/strict"
import {request} from "@playwright/test"
import pg from "pg"
import {sceneFor} from "../../lib/visits/scenes.ts"
const base=process.env.CB_TEST_ORIGIN||"http://localhost:3188"
const ctx=await request.newContext({baseURL:base,extraHTTPHeaders:{origin:base}})
async function api(path,body){
 const res=body===undefined?await ctx.get(path):await ctx.post(path,{data:body})
 if(!res.ok())throw Error(path+" returned "+res.status()+": "+(await res.text()).slice(0,300))
 return res.json()
}
const uid=process.env.CB_TEST_UID,email=process.env.CB_TEST_EMAIL
if(!email?.includes("+cb-migration-"))throw Error("Requires synthetic fixture")
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect()
const role=async value=>{const r=await db.query("update profiles set role=$1 where user_id=$2 and email=$3 and full_name='Migration test volunteer'",[value,uid,email]);assert.equal(r.rowCount,1)}
try{
 await api("/api/auth/sign-in/email",{email,password:process.env.CB_TEST_PASSWORD})
 assert.equal((await api("/api/auth/session")).user.id,uid)
 const historical=await api("/api/dashboard/chat?vid="+process.env.CB_TEST_VID);assert.equal(historical.messages[0].content,"Synthetic historical transcript for account recovery.")
 const scenarios=(await api("/api/scenarios")).scenario
 assert.equal(scenarios.length,3)
 if(process.env.CB_TEST_FULL==="yes"){
  for(const scenario of scenarios){
   const key=scenario.id.replaceAll("-"," ")
   const {conversation,messages}=await api("/api/chat/start",{scenario_name:key,difficulty_level:"Easy"})
   const vid=conversation.vid
   let state=sceneFor(key,messages)
   for(let i=0;i<2;i++){
    const result=await api("/api/chat/next",{converseId:vid,turnId:crypto.randomUUID(),latestMessage:state.choices[0].label})
    messages.push(result.user_message,result.persona_message)
    if(i===0)assert.equal((await api("/api/chat/resume",{scenario_name:key})).conversation.vid,vid)
    state=sceneFor(key,messages)
   }
   assert.ok(state.ended)
   if (key==="House Visit"){
     const completed=await api("/api/chat/end",{converseId:vid,end_early:false})
     assert.ok(completed.scores.length,"Completed visit has saved scores")
     const replay=await api("/api/chat/end",{converseId:vid,end_early:false})
     assert.deepEqual(replay.scores.map(s=>s.sid).sort(),completed.scores.map(s=>s.sid).sort())
   }
   const entry=await api("/api/visits/journal?vid="+vid)
   assert.equal(entry.choices.length,3)
   const retry=await api("/api/visits/journal",{id:crypto.randomUUID(),vid,choice:entry.choices[1]})
   assert.ok(retry.outcome)
   console.log(key,"saved, resumed, resolved and retried")
  }
 }
 assert.equal((await ctx.get("/api/admin/cohorts")).status(),403)
 await role("admin")
 const report=await api("/api/admin/usage?from=2026-01-01&to=2026-11-20")
 assert.ok(report.some(r=>r.kind==="period" && r.eligible>0))
 const csv=await ctx.get("/api/admin/usage?from=2026-01-01&to=2026-11-20&format=csv")
 assert.match(await csv.text(),/participants,eligible,sessions,percentage/)
 await api("/api/admin/cohorts")
 const model=await ctx.get("/visit/margaret.glb");assert.equal((await model.body()).toString("ascii",0,4),"glTF")
 console.log("Sign-in, historical identity, three scenarios, coordinator report, CSV and GLB passed on",base)
}finally{await role("user");await db.end();await ctx.dispose()}
