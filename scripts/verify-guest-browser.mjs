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
      await page.goto(origin + "/")
      const brand = page.getByRole("banner").getByRole("link", { name: "ConverseBetter Beta" })
      await brand.getByText("Beta", { exact: true }).waitFor()
      assert.ok(await brand.evaluate(el => {
        const [name, badge] = el.children
        const n = name.getBoundingClientRect(), b = badge.getBoundingClientRect()
        return b.left > n.right && b.right <= innerWidth && Math.max(n.top, b.top) < Math.min(n.bottom, b.bottom)
      }), "Beta badge must be next to the brand and fit the viewport")
      await page.getByRole("link", { name: /Sign in for live AI practice/i }).click()
      await page.getByText(/Volunteers can sign in for live AI practice and type their own responses/).waitFor()
      await page.getByRole("link", { name: "Try guided demo" }).click()
      await page.getByText("Guided demo", { exact: true }).waitFor()
      await page.getByText(/This guided demo is not live AI practice/).waitFor()
      await brand.getByText("Beta", { exact: true }).waitFor()
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
      await page.getByRole("link", { name: "Sign in for live AI practice" }).click()
      await page.getByRole("heading", { name: "Sign in" }).waitFor()
      assert.deepEqual(errors, [])
      console.log(origin, width, "px — all guest visits passed")
      await context.close()
    }
  }
} finally {
  await browser.close()
}
