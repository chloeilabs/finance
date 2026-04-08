import { existsSync } from "node:fs"

import { expect, type Page, test } from "@playwright/test"

import {
  cleanupTestUser,
  createE2EAuthUser,
  createStorageStatePath,
  deleteStorageState,
  type E2EAuthUser,
  getEnv,
} from "./helpers"


async function signUpThroughUi(page: Page, authUser: E2EAuthUser) {
  await page.goto("/")
  await expect(page).toHaveURL(/\/sign-in$/u)

  await page.getByRole("link", { name: /sign up/i }).click()
  await expect(page).toHaveURL(/\/sign-up$/u)

  await page.getByRole("textbox", { name: "Full Name" }).fill(authUser.name)
  await page.getByRole("textbox", { name: "Email" }).fill(authUser.email)
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(authUser.password)
  await page
    .getByRole("textbox", { name: "Confirm Password" })
    .fill(authUser.password)
  await page.getByRole("button", { name: "Create Account" }).click()

  await expect(page).toHaveURL(/\/$/u, { timeout: 30_000 })
  await expect(
    page.getByRole("heading", { name: "Market overview" })
  ).toBeVisible({ timeout: 30_000 })
}

test.describe.serial("app smoke", () => {
  const authUser = createE2EAuthUser("app-smoke")
  let storageStatePath = ""
  const hasFmpKey = Boolean(getEnv("FMP_API_KEY"))

  test.beforeAll(async () => {
    storageStatePath = await createStorageStatePath(
      `app-smoke-${String(Date.now())}.json`
    )
  })

  test.afterAll(async () => {
    await cleanupTestUser(authUser.email)
    await deleteStorageState(storageStatePath)
  })

  test("sign up and verify protected market flows", async ({ page }) => {
    test.slow()

    await signUpThroughUi(page, authUser)

    await page.context().storageState({ path: storageStatePath })

    await page.goto("/watchlists/core")
    await expect(page.getByRole("heading", { name: "Core" })).toBeVisible({
      timeout: 30_000,
    })

    await page
      .getByRole("textbox", { name: "Add symbols, comma separated" })
      .fill("NFLX")
    await page.getByRole("button", { name: "Add Symbols" }).click()

    const nflxChip = page.getByRole("button", { name: /^NFLX$/u })
    await expect(nflxChip).toBeVisible({ timeout: 15_000 })

    await nflxChip.click()
    await expect(page.getByRole("button", { name: /^NFLX$/u })).toHaveCount(0)

    await page.goto("/stocks/NVDA")
    await expect(page).toHaveURL(/\/stocks\/NVDA$/u)
    if (hasFmpKey) {
      await expect(
        page.getByRole("heading", { name: "NVIDIA Corporation" })
      ).toBeVisible({ timeout: 30_000 })
      await expect(
        page.getByRole("heading", { name: "Price history" })
      ).toBeVisible({ timeout: 30_000 })
    } else {
      await expect(
        page.getByText("FMP_API_KEY is not configured. Market data will stay empty.")
      ).toBeVisible({ timeout: 30_000 })
    }
  })

  test("copilot workspace loads for authenticated users", async ({ browser }) => {
    expect(existsSync(storageStatePath)).toBeTruthy()

    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await page.goto("/copilot")
      await expect(
        page.getByRole("textbox", { name: "Ask anything" })
      ).toBeVisible({ timeout: 30_000 })
    } finally {
      await context.close()
    }
  })

  test("copilot streams a live response @live-ai", async ({ browser }) => {
    test.skip(
      process.env.E2E_ENABLE_COPILOT !== "1",
      "Set E2E_ENABLE_COPILOT=1 to run the live copilot smoke test."
    )
    test.slow()

    expect(existsSync(storageStatePath)).toBeTruthy()

    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    try {
      await page.goto("/copilot")
      await expect(
        page.getByRole("textbox", { name: "Ask anything" })
      ).toBeVisible({ timeout: 30_000 })

      const prompt = "Give me a one-sentence summary of Nvidia right now."
      await page.getByRole("textbox", { name: "Ask anything" }).fill(prompt)

      const agentResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/agent") &&
          response.request().method() === "POST"
      )

      await page.locator("form").getByRole("button").last().click()

      const agentResponse = await agentResponsePromise
      expect(agentResponse.status()).toBe(200)

      await expect(page.getByRole("button", { name: "Activity" })).toBeVisible({
        timeout: 45_000,
      })
      await expect(page.getByText(/FMP:/u).first()).toBeVisible({
        timeout: 45_000,
      })
      await expect(page.locator("main")).toContainText(prompt)
    } finally {
      await context.close()
    }
  })
})
