import { describe, it, expect } from "vitest"
import {
  convertAmount,
  computeTotals,
  withWeights,
  allocationByTheme,
  type HoldingValue,
} from "./calcs"

const rates = { USDCAD: 1.36 }

describe("convertAmount", () => {
  it("retourne tel quel quand from == to", () => {
    expect(convertAmount(100, "CAD", "CAD", rates)).toBe(100)
  })

  it("convertit USD → CAD via taux direct", () => {
    expect(convertAmount(100, "USD", "CAD", rates)).toBeCloseTo(136, 6)
  })

  it("convertit CAD → USD via inverse", () => {
    const v = convertAmount(136, "CAD", "USD", rates)
    expect(v).toBeCloseTo(100, 6)
  })

  it("renvoie null si aucun taux disponible", () => {
    expect(convertAmount(100, "EUR", "CAD", rates)).toBeNull()
  })

  it("renvoie null pour amount null", () => {
    expect(convertAmount(null, "USD", "CAD", rates)).toBeNull()
  })
})

describe("computeTotals", () => {
  const holdings: HoldingValue[] = [
    { symbol: "A", marketValue: 1000, bookValue: 800, unrealizedPnl: 200, currency: "CAD" },
    { symbol: "B", marketValue: 100, bookValue: 200, unrealizedPnl: -100, currency: "USD" },
  ]

  it("agrège correctement en devise de référence", () => {
    const t = computeTotals(holdings, "CAD", rates)
    expect(t.totalMarketValue).toBeCloseTo(1000 + 100 * 1.36, 4) // 1136
    expect(t.totalBookValue).toBeCloseTo(800 + 200 * 1.36, 4) // 1072
    expect(t.totalUnrealizedPnl).toBeCloseTo(200 + -100 * 1.36, 4) // 64
    expect(t.totalUnrealizedPnlPct).toBeCloseTo((64 / 1072) * 100, 4)
  })

  it("retourne pct null si bookValue = 0", () => {
    const t = computeTotals(
      [{ symbol: "X", marketValue: 0, bookValue: 0, unrealizedPnl: 0, currency: "CAD" }],
      "CAD",
      rates,
    )
    expect(t.totalUnrealizedPnlPct).toBeNull()
  })
})

describe("withWeights", () => {
  it("calcule des poids qui somment à 100", () => {
    const { items, total } = withWeights(
      [
        { symbol: "A", marketValue: 600, currency: "CAD" },
        { symbol: "B", marketValue: 400, currency: "CAD" },
      ],
      "CAD",
      rates,
    )
    expect(total).toBe(1000)
    expect(items[0].weight).toBeCloseTo(60, 4)
    expect(items[1].weight).toBeCloseTo(40, 4)
  })

  it("renvoie weight null si total à 0", () => {
    const { items } = withWeights(
      [{ symbol: "Z", marketValue: 0, currency: "CAD" }],
      "CAD",
      rates,
    )
    expect(items[0].weight).toBeNull()
  })
})

describe("allocationByTheme", () => {
  it("agrège par thème et trie par valeur décroissante", () => {
    const allocs = allocationByTheme(
      [
        { symbol: "BTC", marketValue: 1000, currency: "CAD", themeId: "t1", themeName: "Crypto" },
        { symbol: "ETH", marketValue: 500, currency: "CAD", themeId: "t1", themeName: "Crypto" },
        { symbol: "AAPL", marketValue: 300, currency: "USD", themeId: "t2", themeName: "Tech" },
        { symbol: "ORPH", marketValue: 100, currency: "CAD" }, // sans thème
      ],
      "CAD",
      rates,
    )

    expect(allocs[0].themeName).toBe("Crypto")
    expect(allocs[0].marketValueRef).toBe(1500)
    expect(allocs[0].count).toBe(2)
    // 100 + 1500 + 300*1.36 = 2008
    const total = allocs.reduce((s, a) => s + a.marketValueRef, 0)
    expect(total).toBeCloseTo(2008, 4)
    expect(allocs.reduce((s, a) => s + a.weight, 0)).toBeCloseTo(100, 4)

    // "Sans thème" présent
    expect(allocs.find((a) => a.themeId === null)?.themeName).toBe("Sans thème")
  })
})
