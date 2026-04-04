import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedFetchers = vi.hoisted(() => ({
  fetchFmpJson: vi.fn(),
}))

vi.mock("../fmp-request", () => ({
  fetchFmpJson: mockedFetchers.fetchFmpJson,
}))

import { createResearchClient } from "../client/research"

describe("research client analyst summary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses grades consensus for the Street summary", async () => {
    mockedFetchers.fetchFmpJson.mockImplementation(
      (path: string, params: Record<string, string>) => {
        expect(params).toEqual({ symbol: "VICI" })

        switch (path) {
          case "/stable/price-target-consensus":
            return Promise.resolve([
              {
                targetConsensus: 33,
                targetHigh: 36,
                targetLow: 29,
              },
            ])
          case "/stable/grades":
            return Promise.resolve([
              {
                date: "2026-04-01",
                gradingCompany: "Morgan Stanley",
                newGrade: "Equal-Weight",
              },
            ])
          case "/stable/grades-consensus":
            return Promise.resolve([
              {
                consensus: "Moderate Buy",
              },
            ])
          default:
            return Promise.resolve([])
        }
      }
    )

    const summary = await createResearchClient().analyst.getSummary("VICI")

    expect(summary).toEqual(
      expect.objectContaining({
        ratingSummary: "Moderate Buy",
        targetConsensus: 33,
      })
    )
    expect(summary?.grades).toEqual([
      expect.objectContaining({
        grade: "Equal-Weight",
        provider: "Morgan Stanley",
      }),
    ])
  })
})
