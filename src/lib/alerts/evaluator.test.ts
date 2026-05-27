import { describe, it, expect } from "vitest"
import {
  evaluatePctChange,
  evaluateEventProximity,
  type HoldingSnapshot,
  type MacroEventSnapshot,
} from "./evaluator"

const today = "2026-05-27"

const holdings: HoldingSnapshot[] = [
  { symbol: "ETHX.B", day_change_pct: -6.2, market_value: 510, unrealized_pnl: 115.5,
    unrealized_pnl_pct: 29.28, currency: "CAD", theme_name: "Crypto-ETF" },
  { symbol: "HUT",    day_change_pct: 4.92, market_value: 792.5, unrealized_pnl: 738.3,
    unrealized_pnl_pct: 1362, currency: "CAD", theme_name: "Mining crypto" },
  { symbol: "BABA",   day_change_pct: -0.19, market_value: 1792, unrealized_pnl: 534.88,
    unrealized_pnl_pct: 42.5, currency: "CAD", theme_name: null },
  { symbol: "PQEFF",  day_change_pct: null, market_value: 0, unrealized_pnl: -406.95,
    unrealized_pnl_pct: -100, currency: "CAD", theme_name: null },
]

describe("evaluatePctChange", () => {
  it("déclenche sur les positions qui dépassent le seuil (any scope)", () => {
    const triggers = evaluatePctChange({ threshold_pct: 5 }, holdings, today)
    expect(triggers).toHaveLength(1)
    expect(triggers[0].symbol).toBe("ETHX.B")
    expect(triggers[0].dedup_key).toBe(`pct_change:ETHX.B:${today}`)
  })

  it("scope symbol filtre sur le ticker exact", () => {
    const triggers = evaluatePctChange(
      { threshold_pct: 3, scope: "symbol", symbol: "HUT" },
      holdings,
      today,
    )
    expect(triggers).toHaveLength(1)
    expect(triggers[0].symbol).toBe("HUT")
  })

  it("ignore les day_change_pct null (positions zombies, etc.)", () => {
    const triggers = evaluatePctChange({ threshold_pct: 1 }, holdings, today)
    expect(triggers.find((t) => t.symbol === "PQEFF")).toBeUndefined()
  })

  it("traite le seuil en valeur absolue (variation positive ou négative)", () => {
    const triggers = evaluatePctChange({ threshold_pct: 4 }, holdings, today)
    const symbols = triggers.map((t) => t.symbol).sort()
    expect(symbols).toEqual(["ETHX.B", "HUT"])
  })
})

describe("evaluateEventProximity", () => {
  const now = new Date("2026-05-27T12:00:00Z")
  const events: MacroEventSnapshot[] = [
    { id: "e1", kind: "fomc",        title: "FOMC juin",        scheduled_at: "2026-06-17T18:00:00Z" },
    { id: "e2", kind: "cpi_release", title: "CPI publication",  scheduled_at: "2026-05-30T12:30:00Z" },
    { id: "e3", kind: "fomc",        title: "FOMC juillet",     scheduled_at: "2026-07-29T18:00:00Z" },
  ]

  it("déclenche pour les événements dans la fenêtre", () => {
    const triggers = evaluateEventProximity({ days_until: 7 }, events, now)
    expect(triggers).toHaveLength(1)
    expect(triggers[0].related_event?.id).toBe("e2")
  })

  it("filtre par type d'événement quand kinds est fourni", () => {
    const triggers = evaluateEventProximity({ days_until: 30, kinds: ["fomc"] }, events, now)
    expect(triggers.map((t) => t.related_event?.id)).toEqual(["e1"])
  })

  it("ignore les événements passés (days < 0)", () => {
    const past: MacroEventSnapshot[] = [
      { id: "old", kind: "cpi_release", title: "CPI passé", scheduled_at: "2026-05-01T12:30:00Z" },
      ...events,
    ]
    const triggers = evaluateEventProximity({ days_until: 60 }, past, now)
    expect(triggers.find((t) => t.related_event?.id === "old")).toBeUndefined()
  })

  it("dedup key inclut le jour pour éviter les re-triggers intra-day", () => {
    const triggers = evaluateEventProximity({ days_until: 7 }, events, now)
    expect(triggers[0].dedup_key).toBe(`event_proximity:e2:2026-05-27`)
  })
})
