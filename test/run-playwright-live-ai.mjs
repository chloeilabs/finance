import { spawnSync } from "node:child_process"

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const result = spawnSync(command, ["exec", "playwright", "test"], {
  stdio: "inherit",
  env: {
    ...process.env,
    E2E_ENABLE_COPILOT: "1",
  },
})

process.exit(result.status ?? 1)
