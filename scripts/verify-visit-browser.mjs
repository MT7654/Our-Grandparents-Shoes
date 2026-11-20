import { build } from "esbuild"
import { chromium } from "@playwright/test"
import { createServer } from "node:http"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import assert from "node:assert/strict"
import { visits, sceneFor, resolveChoice } from "../lib/visits/scenes.ts"

const bundle = await build({
  stdin: {
    contents:
      'import React from "react";import{createRoot}from"react-dom/client";import Chat from "./app/chat/[scenarioId]/page";createRoot(document.getElementById("app")).render(<Chat/>);',
    resolveDir: process.cwd(),
    loader: "tsx"
  },
  jsx: "automatic",
  bundle: true,
  write: false,
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_DISABLE_VISIT_3D": '""'
  },
  plugins: [
    {
      name: "fixture-navigation",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture"
        }))
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "next/link"
              ? 'export default "a"'
              : "const router={push(){}};export const useRouter=()=>router;export const useParams=()=>({scenarioId:decodeURIComponent(location.pathname.slice(1))});"
        }))
      }
    }
  ]
})
const cssDir = ".next/static/chunks"
const css = readdirSync(cssDir)
  .filter((x) => x.endsWith(".css"))
  .map((x) => readFileSync(join(cssDir, x), "utf8"))
  .join("\n")
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript")
    return res.end(bundle.outputFiles[0].contents)
  }
  if (req.url === "/style.css") {
    res.setHeader("Content-Type", "text/css")
    return res.end(css)
  }
  if (/^\/visit\/[a-z]+\.(glb|png|webp)$/.test(req.url))
    return res.end(readFileSync("public" + req.url))
  res.setHeader("Content-Type", "text/html")
  res.end(
    '<meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"><div id="app"></div><script src="/bundle.js"></script>'
  )
})
await new Promise((ok) => server.listen(0, "127.0.0.1", ok))
const url = "http://127.0.0.1:" + server.address().port
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || chromium.executablePath()
const browser = await chromium.launch({ executablePath, headless: true })
const scenarios = JSON.parse(readFileSync("lib/scenarios.json", "utf8")),
  persona = JSON.parse(readFileSync("lib/personas.json", "utf8")).Margaret
try {
  for (const [index, visit] of visits.entries())
    for (const typed of [false, true]) {
      const reason = typed ? "typed" : "tap",
        page = await browser.newPage({
          viewport: typed
            ? { width: 1200, height: 800 }
            : { width: 390, height: 640 },
          reducedMotion: typed ? "no-preference" : "reduce"
        })
      if(typed && index===2)await page.route("**/visit/margaret.glb",r=>r.abort())
      if(typed && index===3)await page.addInitScript(()=>{
        const get=HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith("webgl")?null:get.call(this,type,...args)}
      })
      const messages = [],
        vid = crypto.randomUUID()
      const message = (sender, content) => ({
        mid: crypto.randomUUID(),
        vid,
        sender,
        content,
        sent_at: new Date().toISOString(),
        feedback: null,
        status: null
      })
      const state = () => ({
        scenario: scenarios[visit.scenario],
        persona,
        conversation: { vid, difficulty: "Easy", turns: 10 },
        messages,
        evaluation: null
      })
      await page.route("**/api/chat/*", async (route) => {
        const op = route.request().url().split("/").pop()
        let json = {}
        if (op === "resume" && messages.length) json = state()
        if (op === "start") {
          messages.push(message("persona", visit.opening))
          json = state()
        }
        if (op === "next") {
          const text = route.request().postDataJSON().latestMessage
          const action = resolveChoice(
            sceneFor(visit.scenario, messages).choices,
            text
          )
          assert.ok(action)
          const user_message = message("user", text),
            persona_message = message("persona", action.reply)
          messages.push(user_message, persona_message)
          json = {
            user_message,
            persona_message,
            completed: sceneFor(visit.scenario, messages).ended
          }
        }
        await route.fulfill({ json })
      })
      await page.goto(url + "/" + scenarios[visit.scenario].id)
      await page.getByRole("button", { name: "Easy", exact: true }).click()
      const choices = [
        visit.greeting,
        visit.choices[index === 0 ? 1 : index === 1 ? 0 : 2]
      ]
      for (const [i, action] of choices.entries()) {
        await page
          .getByRole("button", { name: action.label, exact: true })
          .waitFor()
        if (i === 1) {
          if(typed && index===0){
            const canvas=page.locator("canvas").first()
            if(await canvas.count())await canvas.evaluate(c=>c.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext())
          }
          await page.reload()
          await page.getByRole("button",{name:action.label,exact:true}).waitFor()
          if(!typed){await page.setViewportSize({width:390,height:470});await page.getByRole("textbox",{name:"Say something"}).focus()}
          if(typed)await page.screenshot({path:"assets/margaret/decision-"+index+".png"})
        }
        if (typed) {
          const input = page.getByRole("textbox", { name: "Say something" })
          await page
            .getByRole("button", { name: action.label, exact: true })
            .waitFor()
          await input.fill(action.label)
          await input.press("Enter")
        } else
          await page
            .getByRole("button", { name: action.label, exact: true })
            .click()
        await page.getByText(action.reply, { exact: true }).waitFor()
      }
      await page.getByRole("button", { name: "View Results" }).waitFor()
      assert.equal(messages.filter((m) => m.sender === "user").length, 2)
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      )
      console.log(visit.scenario, reason, "completed through resume; document loaded in",await page.evaluate(()=>Math.round(performance.getEntriesByType("navigation")[0].duration)),"ms")
      await page.close()
    }
} finally {
  await browser.close()
  server.close()
}
