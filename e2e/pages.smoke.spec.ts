import { existsSync } from "node:fs"

import { expect, type Page, test } from "@playwright/test"

import {
  cleanupTestUser,
  createE2EAuthUser,
  createStorageStatePath,
  deleteStorageState,
  getEnv,
  signUpThroughUi,
} from "./helpers"

/**
 * Verify that a page navigates successfully and renders at least one
 * identifiable element. When FMP data is available the test checks for
 * data-specific headings; otherwise it just confirms the page loaded
 * without an unrecoverable error.
 */
async function expectPageLoads(
  page: Page,
  url: string,
  urlPattern: RegExp,
  assertions: (page: Page) => Promise<void>
) {
  await page.goto(url)
  await expect(page).toHaveURL(urlPattern)
  await assertions(page)
}

test.describe.serial("page navigation smoke", () => {
  const authUser = createE2EAuthUser("page-smoke")
  let storageStatePath = ""
  const hasFmpKey = Boolean(getEnv("FMP_API_KEY"))

  test.beforeAll(async () => {
    storageStatePath = await createStorageStatePath(
      `page-smoke-${String(Date.now())}.json`
    )
  })

  test.afterAll(async () => {
    await cleanupTestUser(authUser.email)
    await deleteStorageState(storageStatePath)
  })

  // ── Setup ──────────────────────────────────────────────────────────

  test("sign up and save auth state", async ({ page }) => {
    test.slow()

    await signUpThroughUi(page, authUser)
    await page.context().storageState({ path: storageStatePath })
  })

  // ── Core pages ─────────────────────────────────────────────────────

  test("home page loads", async ({ browser }) => {
    expect(existsSync(storageStatePath)).toBeTruthy()
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(page, "/", /\/$/u, async (p) => {
        await expect(
          p.getByRole("heading", { name: "Market overview" })
        ).toBeVisible({ timeout: 30_000 })
      })
    } finally {
      await context.close()
    }
  })

  test("news page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(page, "/news", /\/news$/u, async (p) => {
        await expect(
          p.getByRole("heading", { name: "Market news" })
        ).toBeVisible({ timeout: 30_000 })
      })
    } finally {
      await context.close()
    }
  })

  test("portfolio page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(page, "/portfolio", /\/portfolio$/u, async (p) => {
        await expect(p.getByRole("heading", { name: /portfolio/iu })).toBeVisible({
          timeout: 30_000,
        })
      })
    } finally {
      await context.close()
    }
  })

  test("settings page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(page, "/settings", /\/settings$/u, async (p) => {
        await expect(
          p.getByRole("heading", { name: "Settings" })
        ).toBeVisible({ timeout: 30_000 })
      })
    } finally {
      await context.close()
    }
  })

  // ── Stock detail pages ─────────────────────────────────────────────

  test("stock overview page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL",
        /\/stocks\/AAPL$/u,
        async (p) => {
          await expect(p.getByRole("link", { name: "Chart" })).toBeVisible({
            timeout: 30_000,
          })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock chart page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/chart",
        /\/stocks\/AAPL\/chart$/u,
        async (p) => {
          await expect(
            p.getByRole("heading", { name: "Chart Workspace" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock profile page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/profile",
        /\/stocks\/AAPL\/profile$/u,
        async (p) => {
          await expect(
            p.getByRole("heading", { name: "Company Profile" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock financials page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/financials",
        /\/stocks\/AAPL\/financials$/u,
        async (p) => {
          await expect(
            p.getByRole("link", { name: "Financials" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock metrics page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/metrics",
        /\/stocks\/AAPL\/metrics$/u,
        async (p) => {
          await expect(p.getByRole("link", { name: "Metrics" })).toBeVisible({
            timeout: 30_000,
          })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock statistics page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/statistics",
        /\/stocks\/AAPL\/statistics$/u,
        async (p) => {
          if (hasFmpKey) {
            await expect(
              p.getByRole("heading", { name: "Total Valuation" })
            ).toBeVisible({ timeout: 30_000 })
          }
          await expect(
            p.getByRole("link", { name: "Statistics" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock forecast page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/forecast",
        /\/stocks\/AAPL\/forecast$/u,
        async (p) => {
          await expect(
            p.getByRole("link", { name: "Forecast" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock dividends page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/dividends",
        /\/stocks\/AAPL\/dividends$/u,
        async (p) => {
          if (hasFmpKey) {
            await expect(
              p.getByRole("heading", { name: "Dividend Information" })
            ).toBeVisible({ timeout: 30_000 })
          }
          await expect(
            p.getByRole("link", { name: "Dividends" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("stock history page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/stocks/AAPL/history",
        /\/stocks\/AAPL\/history$/u,
        async (p) => {
          if (hasFmpKey) {
            await expect(
              p.getByRole("heading", { name: "Price History" })
            ).toBeVisible({ timeout: 30_000 })
          }
          await expect(
            p.getByRole("link", { name: "History" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  // ── ETF detail pages ───────────────────────────────────────────────

  test("etf overview page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/etfs/SPY",
        /\/etfs\/SPY$/u,
        async (p) => {
          if (hasFmpKey) {
            await expect(
              p.getByRole("heading", { name: /About SPY/iu })
            ).toBeVisible({ timeout: 30_000 })
          }
          await expect(p.getByRole("link", { name: "Chart" })).toBeVisible({
            timeout: 30_000,
          })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("etf chart page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/etfs/SPY/chart",
        /\/etfs\/SPY\/chart$/u,
        async (p) => {
          await expect(
            p.getByRole("heading", { name: "Chart Workspace" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("etf holdings page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/etfs/SPY/holdings",
        /\/etfs\/SPY\/holdings$/u,
        async (p) => {
          await expect(
            p.getByRole("heading", { name: "Holdings" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("etf dividends page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/etfs/SPY/dividends",
        /\/etfs\/SPY\/dividends$/u,
        async (p) => {
          if (hasFmpKey) {
            await expect(
              p.getByRole("heading", { name: "Dividend Information" })
            ).toBeVisible({ timeout: 30_000 })
          }
          await expect(
            p.getByRole("link", { name: "Dividends" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  test("etf history page loads", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await expectPageLoads(
        page,
        "/etfs/SPY/history",
        /\/etfs\/SPY\/history$/u,
        async (p) => {
          if (hasFmpKey) {
            await expect(
              p.getByRole("heading", { name: "Price History" })
            ).toBeVisible({ timeout: 30_000 })
          }
          await expect(
            p.getByRole("link", { name: "History" })
          ).toBeVisible({ timeout: 30_000 })
        }
      )
    } finally {
      await context.close()
    }
  })

  // ── Auth guard ─────────────────────────────────────────────────────

  test("unauthenticated users are redirected to sign-in", async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await page.goto("/")
      await expect(page).toHaveURL(/\/sign-in$/u, { timeout: 30_000 })
    } finally {
      await context.close()
    }
  })
})
