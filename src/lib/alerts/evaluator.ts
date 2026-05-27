/**
 * Évaluateur déterministe d'alertes. Fonctions pures testables.
 *
 * Deux types couverts en V1 :
 *  - `pct_change`     : une position bouge de ±X % sur la journée
 *  - `event_proximity`: un catalyseur (FOMC/CPI) est dans ≤ N jours
 *
 * Les autres types de l'enum (price_threshold, macro_release, custom)
 * restent stockables mais ne sont pas évalués en V1.
 */

export type AlertConfig =
  | { threshold_pct: number; scope?: "any" | "symbol"; symbol?: string }   // pct_change
  | { days_until: number; kinds?: string[] }                                // event_proximity
  | Record<string, unknown>                                                 // catch-all

export type HoldingSnapshot = {
  symbol: string
  day_change_pct: number | null
  market_value: number | null
  unrealized_pnl: number | null
  unrealized_pnl_pct: number | null
  currency: string
  theme_name: string | null
}

export type MacroEventSnapshot = {
  id: string
  kind: string
  title: string
  scheduled_at: string // ISO
}

export type TriggerCandidate = {
  reason: string
  triggered_value: number | null
  symbol?: string
  related_holdings?: string[]
  related_event?: MacroEventSnapshot
  /** Clé d'idempotence : on ne déclenche pas deux fois le même alerte sur le même jour avec la même cible. */
  dedup_key: string
}

const DAY_MS = 86_400_000

export function evaluatePctChange(
  config: { threshold_pct: number; scope?: "any" | "symbol"; symbol?: string },
  holdings: HoldingSnapshot[],
  today: string,
): TriggerCandidate[] {
  const threshold = Math.abs(config.threshold_pct)
  const matches: TriggerCandidate[] = []

  const scoped =
    config.scope === "symbol" && config.symbol
      ? holdings.filter((h) => h.symbol.toUpperCase() === config.symbol!.toUpperCase())
      : holdings

  for (const h of scoped) {
    if (h.day_change_pct === null) continue
    if (Math.abs(h.day_change_pct) < threshold) continue
    matches.push({
      reason:
        `${h.symbol} a varié de ${h.day_change_pct.toFixed(2)} % sur la journée ` +
        `(seuil : ±${threshold} %).`,
      triggered_value: h.day_change_pct,
      symbol: h.symbol,
      related_holdings: [h.symbol],
      dedup_key: `pct_change:${h.symbol}:${today}`,
    })
  }
  return matches
}

export function evaluateEventProximity(
  config: { days_until: number; kinds?: string[] },
  events: MacroEventSnapshot[],
  now: Date = new Date(),
): TriggerCandidate[] {
  const threshold = Math.max(0, Math.floor(config.days_until))
  const allowedKinds = config.kinds && config.kinds.length > 0 ? new Set(config.kinds) : null
  const matches: TriggerCandidate[] = []

  for (const e of events) {
    if (allowedKinds && !allowedKinds.has(e.kind)) continue
    const days = Math.ceil((new Date(e.scheduled_at).getTime() - now.getTime()) / DAY_MS)
    if (days < 0 || days > threshold) continue
    matches.push({
      reason: `${e.title} dans ${days} jour${days > 1 ? "s" : ""} (seuil : ≤ ${threshold}).`,
      triggered_value: days,
      related_event: e,
      // Dedup par event + jour de déclenchement : si on évalue plusieurs fois
      // dans la même journée, on ne re-trigger pas.
      dedup_key: `event_proximity:${e.id}:${now.toISOString().slice(0, 10)}`,
    })
  }
  return matches
}
