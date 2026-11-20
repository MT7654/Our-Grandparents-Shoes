import { build } from "esbuild"
import { chromium } from "@playwright/test"
import { createServer } from "node:http"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import assert from "node:assert/strict"
import { visits } from "../lib/visits/scenes.ts"

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
  if (/^\/visit\/[a-z-]+\.(glb|png|webp)$/.test(req.url))
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
  for (const [index, visit] of visits.entries()) {
    for (const difficulty of ["Easy", "Hard"]) {
      const easy = difficulty === "Easy"
      const page = await browser.newPage({
        viewport: easy ? { width: 320, height: 470 } : { width: 1200, height: 800 },
        reducedMotion: easy ? "reduce" : "no-preference"
      })
      if (!easy && index === 2) await page.route("**/visit/margaret.glb", (route) => route.abort())
      if (!easy && index === 3) await page.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type.startsWith("webgl") ? null : get.call(this, type, ...args)
        }
      })

      const messages = []
      const vid = crypto.randomUUID()
      const closeAt = 4
      const reasons = ["objective_met", "boundary", "turn_limit", "objective_met"]
      const reason = reasons[index]
      const closeCopy = {
        objective_met: "You met the visit objective.",
        boundary: "Margaret indicated that she wanted to end the visit.",
        turn_limit: "This visit reached the practice turn limit."
      }
      const message = (sender, content) => ({
        mid: crypto.randomUUID(), vid, sender, content, sent_at: new Date().toISOString(),
        feedback: null, status: null
      })
      let turns = closeAt
      let completed = false
      let forceAssessmentRetry = index === 2 && easy
      let sent = 0
      let endRequested = false
      const state = () => ({
        scenario: scenarios[visit.scenario], persona,
        conversation: { vid, difficulty, turns, end_reason: completed ? reason : null, completed },
        messages, evaluation: null
      })
      await page.route("**/api/chat/*", async (route) => {
        const op = route.request().url().split("/").pop()
        let json = {}
        if (op === "resume" && messages.length) json = state()
        if (op === "start") {
          assert.equal(route.request().postDataJSON().difficulty_level, difficulty)
          messages.push(message("persona", visit.opening))
          json = state()
        }
        if (op === "next") {
          sent++
          const text = route.request().postDataJSON().latestMessage
          // The previous UI inferred an ending from the second authored reply.
          // A later real AI reply must be allowed even when the wording matches.
          const content = sent === 1 ? visit.greeting.reply
            : sent === 2 ? visit.choices[0].reply
            : "A live reply, not in the script. Turn " + sent
          const user_message = message("user", text), persona_message = message("persona", content)
          messages.push(user_message, persona_message)
          turns--
          json = { user_message, persona_message, turns, completed: false, pendingEvaluation: true }
        }
        if (op === "evaluate") {
          if (forceAssessmentRetry && turns === 0) {
            forceAssessmentRetry = false
            return route.fulfill({ status: 503, json: { error: "Fixture assessment delay" } })
          }
          completed = sent === closeAt
          json = { turns, completed, end_reason: completed ? reason : null }
        }
        if (op === "end") {
          assert.equal(route.request().postDataJSON().end_early, false)
          endRequested = true
        }
        await route.fulfill({ json })
      })

      await page.goto(url + "/" + scenarios[visit.scenario].id)
      const levels = page.getByRole("dialog", { name: "Select difficulty" })
      await levels.waitFor()
      assert.equal(await page.getByText(/0 turns remaining/i).count(), 0)
      assert.deepEqual(
        await levels.getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.querySelector("span")?.textContent)),
        ["Easy", "Hard"]
      )
      await levels.getByRole("button", { name: new RegExp("^" + difficulty) }).click()
      const input = page.getByRole("textbox", { name: "Type your reply" })
      const hints = page.getByText("Show reply hints", { exact: true })
      const send = page.getByRole("button", { name: "Send reply", exact: true })
      const results = page.getByRole("button", { name: "View results", exact: true })
      const log = page.getByRole("log", { name: "Conversation messages" })
      await page.getByText(visit.opening, { exact: true }).waitFor()

      if (easy) {
        const openingHint = page.getByRole("button", { name: visit.greeting.label, exact: true })
        assert.equal(await openingHint.isVisible(), false)
        await hints.click()
        await input.fill("A draft I want to keep")
        assert.equal(await openingHint.isDisabled(), true)
        assert.equal(await input.inputValue(), "A draft I want to keep")
        await input.clear()
        await openingHint.click()
        assert.equal(await input.inputValue(), visit.greeting.label)
        assert.equal(sent, 0)
        await input.fill((await input.inputValue()) + " I can make it quick.")
      } else {
        assert.equal(await hints.count(), 0)
        await input.fill("Good afternoon. How are you doing today?")
      }
      await input.press("Enter")
      await page.getByText(visit.greeting.reply, { exact: true }).waitFor()

      if (easy) {
        await page.reload()
        await page.getByText(visit.greeting.reply, { exact: true }).waitFor()
        await page.getByText("Look around the flat", { exact: true }).click()
        await page.locator("details[open] details > summary").first().click()
        const portrait = page.getByRole("img", { name: persona.name, exact: true })
        const scrollport = page.getByLabel("Visit conversation", { exact: true })
        await scrollport.evaluate(el => { el.scrollTop = 0 })
        const top = await portrait.evaluate(el => el.getBoundingClientRect().top)
        assert.ok(await scrollport.evaluate(el => {
          el.scrollTop = el.scrollHeight
          return el.scrollTop > 0
        }), "A long conversation must scroll independently")
        assert.ok(await portrait.evaluate((el, before) => {
          const rect = el.getBoundingClientRect()
          return rect.top === before && rect.top >= 0 && rect.bottom <= innerHeight && el.naturalWidth > 0
        }, top), "Margaret's face must stay visible while reading the transcript")
        await log.scrollIntoViewIfNeeded()
        assert.ok(await log.evaluate((el) => el.getBoundingClientRect().height > 100))
        await hints.click()
        assert.ok(await send.evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight))
        assert.ok(await page.getByRole("region", { name: "Reply hints" }).getByRole("button").evaluateAll(
          (buttons) => buttons.every((button) => {
            const label = button.querySelector("span")
            return label && label.scrollWidth <= label.clientWidth && button.getBoundingClientRect().height >= 44
          })
        ))
        await page.getByRole("button", { name: visit.choices[0].label, exact: true }).click()
      } else {
        if (index === 0) {
          await page.getByRole("button", { name: "End visit early", exact: true }).click()
          await page.getByRole("dialog", { name: "End this visit early?" }).waitFor()
          await page.getByRole("button", { name: "Keep practising", exact: true }).click()
          assert.equal(endRequested, false)
        }
        await input.fill("Would you like me to ask about that, or would you prefer some quiet?")
      }
      await send.click()
      await page.getByText(visit.choices[0].reply, { exact: true }).waitFor()
      assert.equal(await results.isVisible(), false)

      for (const turn of [3, 4]) {
        await input.fill("My original follow-up for turn " + turn)
        await send.click()
        await page.getByText("A live reply, not in the script. Turn " + turn, { exact: true }).waitFor()
        if (turn < 4) assert.equal(await results.isVisible(), false)
      }
      if (index === 2 && easy) {
        await page.getByRole("button", { name: "Retry assessment", exact: true }).click()
      }
      await page.getByText(closeCopy[reason], { exact: true }).waitFor()
      await results.waitFor()
      assert.equal(sent, closeAt)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      const saved = page.waitForResponse("**/api/chat/end")
      await results.click()
      assert.equal((await saved).status(), 200)
      assert.equal(endRequested, true)
      console.log(visit.scenario, difficulty, "completed four live turns with", reason)
      await page.close()
    }
  }
} finally {
  await browser.close()
  server.close()
}
