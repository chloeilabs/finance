/**
 * Live browser smoke tests.
 *
 * These tests verify critical user-facing paths against any running
 * environment (local, staging, production).  Unlike the standard E2E
 * suite they do **not** require direct database access — authentication
 * is handled via pre-existing credentials supplied through environment
 * variables:
 *
 *   E2E_LIVE_EMAIL    – email of an existing account
 *   E2E_LIVE_PASSWORD – password for that account
 *
 * Run with:
 *   PLAYWRIGHT_BASE_URL=https://example.com \
 *   E2E_LIVE_EMAIL=test@example.com \
 *   E2E_LIVE_PASSWORD=secret \
 *   pnpm test:e2e:live
 */

import { expect, type Page, test } from "@playwright/test"

import { getEnv } from "./helpers"

/* ------------------------------------------------------------------ */
/*  Environment                                                       */
/* ------------------------------------------------------------------ */

const liveEmail = getEnv("E2E_LIVE_EMAIL")
const livePassword = getEnv("E2E_LIVE_PASSWORD")
const hasCredentials = Boolean(liveEmail && livePassword)

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in")
  await expect(page).toHaveURL(/\/sign-in$/u)

  await page.getByRole("textbox", { name: "Email" }).fill(liveEmail ?? "")
  await page.getByRole("textbox", { name: "Password" }).fill(livePassword ?? "")
  await page.getByRole("button", { name: "Sign In" }).click()

  await expect(page).toHaveURL(/\/$/u, { timeout: 30_000 })
}

async function expectVisible(
  page: Page,
  role: Parameters<Page["getByRole"]>[0],
  options: Parameters<Page["getByRole"]>[1],
  timeout = 30_000
): Promise<void> {
  await expect(page.getByRole(role, options)).toBeVisible({ timeout })
}

/**
 * Detect whether the target deployment has FMP market data configured by
 * checking for the app's "not configured" banner.  This avoids relying on
 * the *runner's* `FMP_API_KEY` env var, which may differ from the target.
 */
async function targetHasFmpData(page: Page): Promise<boolean> {
  const banner = page.getByText("FMP_API_KEY is not configured")
  return !(await banner.isVisible().catch(() => false))
}

/* ------------------------------------------------------------------ */
/*  Public pages (no credentials required)                            */
/* ------------------------------------------------------------------ */

test.describe("live smoke – public pages", () => {
  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in")
    await expect(page).toHaveURL(/\/sign-in$/u)
    await expectVisible(page, "button", { name: "Sign In" })
  })

  test("sign-up page renders", async ({ page }) => {
    await page.goto("/sign-up")
    await expect(page).toHaveURL(/\/sign-up$/u)
    await expectVisible(page, "button", { name: "Create Account" })
  })

  test("unauthenticated visit redirects to sign-in", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/sign-in$/u, { timeout: 30_000 })
  })
})

/* ------------------------------------------------------------------ */
/*  Authenticated pages                                               */
/* ------------------------------------------------------------------ */

test.describe.serial("live smoke – authenticated", () => {
  test.skip(!hasCredentials, "Set E2E_LIVE_EMAIL and E2E_LIVE_PASSWORD to run.")

  test("sign in and verify home page", async ({ page }) => {
    await signIn(page)
    await expectVisible(page, "heading", { name: "Market overview" })
  })

  test("news page loads", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await signIn(page)
      await page.goto("/news")
      await expectVisible(page, "heading", { name: "Market news" })
    } finally {
      await context.close()
    }
  })

  test("stock detail page loads", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await signIn(page)
      await page.goto("/stocks/AAPL")
      await expect(page).toHaveURL(/\/stocks\/AAPL$/u)
      await expectVisible(page, "link", { name: "Chart", exact: true })

      if (await targetHasFmpData(page)) {
        await expectVisible(page, "heading", { name: "Apple Inc." })
      }
    } finally {
      await context.close()
    }
  })

  test("etf detail page loads", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await signIn(page)
      await page.goto("/etfs/SPY")
      await expect(page).toHaveURL(/\/etfs\/SPY$/u)
      await expectVisible(page, "link", { name: "Chart", exact: true })

      if (await targetHasFmpData(page)) {
        await expectVisible(page, "heading", { name: /About SPY/iu })
      }
    } finally {
      await context.close()
    }
  })

  test("copilot workspace loads", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await signIn(page)
      await page.goto("/copilot")
      await expectVisible(page, "textbox", { name: "Ask anything" })
    } finally {
      await context.close()
    }
  })

  test("portfolio page loads", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await signIn(page)
      await page.goto("/portfolio")
      await expectVisible(page, "heading", { name: /portfolio/iu })
    } finally {
      await context.close()
    }
  })

  test("settings page loads", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await signIn(page)
      await page.goto("/settings")
      await expectVisible(page, "heading", { name: "Settings" })
    } finally {
      await context.close()
    }
  })
})
