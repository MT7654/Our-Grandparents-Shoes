import assert from "node:assert/strict"
import { chromium } from "@playwright/test"

const origins = process.argv.slice(2)
assert.ok(origins.length, "Supply a running application URL")
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true
})
try {
  for (const origin of origins) {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        reducedMotion: "reduce"
      })
      const page = await context.newPage()
      const errors = []
      page.on("pageerror", error => errors.push(error.message))
      await page.goto(origin + "/auth")
      await page.getByRole("link", { name: "Continue as guest" }).click()
      for (const [name, greeting, response] of [
        ["House Visit", "Hello, I'm your volunteer. Is now a good time?", "Would another time suit you better?"],
        ["Emotional Listening Ear", "Would you like some company?", "Sit quietly with Margaret"],
        ["Resolve a Task", "Would you like a hand?", "Could you show me how?"]
      ]) {
        await page.getByRole("button", { name: "Start " + name, exact: true }).click()
        await page.getByRole("button", { name: greeting, exact: true }).click()
        await page.getByRole("button", { name: response, exact: true }).click()
        await page.getByRole("heading", { name: "Visit complete" }).waitFor()
        assert.equal(await page.locator("main").evaluate(el => el.scrollWidth > innerWidth), false)
        await page.getByRole("button", { name: "Choose another visit" }).click()
      }
      await page.getByRole("link", { name: "Back to sign in" }).click()
      await page.getByRole("heading", { name: "Sign in" }).waitFor()
      assert.deepEqual(errors, [])
      console.log(origin, width, "px — all guest visits passed")
      await context.close()
    }
  }
} finally {
  await browser.close()
}
