import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { chromium } from "@playwright/test"

// Use a local production build. Only the pre-logout identity and dashboard data
// are fixtures. Sign-out, cookie expiry, navigation and the route guard are real.
const origin = "http://localhost:3196"
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
try {
  for (const [role, path] of [["admin", "/admin"], ["user", "/scenarios"]]) {
    const context = await browser.newContext()
    try {
      const page = await context.newPage()
      let active = true
      await page.route(origin + "/**", async route => {
        const url = new URL(route.request().url())
        if (active && url.pathname === path && route.request().isNavigationRequest()) {
          return route.fulfill({ contentType: "text/html", body: await readFile(".next/server/app" + path + ".html") })
        }
        if (active && url.pathname.startsWith("/api/") && url.pathname !== "/api/auth/logout") {
          const json = url.pathname === "/api/auth/session" ? { user: { role } }
            : url.pathname === "/api/admin/usage" ? [] : { scenario: [], cohorts: [], assignments: [], attempts: [], volunteers: [] }
          return route.fulfill({ json })
        }
        if (url.pathname === "/api/auth/logout") active = false
        await route.continue()
      })
      await page.goto(origin + path)
      await context.addCookies([{ name: "__Secure-neon-auth.local.session_data", value: "expired-fixture", domain: "localhost", path: "/", secure: true, httpOnly: true }])
      await page.getByRole("button", { name: "Sign out", exact: true }).click()
      await page.waitForURL(origin + "/")
      assert.ok(!(await context.cookies()).some(c => c.name.startsWith("__Secure-neon-auth.")))
      const login = page.getByRole("link", { name: "Sign in for live AI practice" })
      await login.click()
      await page.waitForURL(origin + "/auth")
      await page.getByRole("button", { name: "Sign in as a volunteer" }).waitFor()
      await page.getByRole("button", { name: "Sign in as an admin" }).waitFor()
      await page.goto(origin + path)
      await page.waitForURL(origin + "/auth")
      console.log(role + ": sign-out, cookie expiry, role chooser and signed-out route guard passed")
    } finally { await context.close() }
  }
} finally { await browser.close() }


