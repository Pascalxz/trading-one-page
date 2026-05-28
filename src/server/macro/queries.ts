import "server-only"
import { createClient } from "@/lib/supabase/server"

export type MacroPoint = { date: string; value: number }

export type MacroSeriesData = {
  key: string
  label: string
  unit: string | null
  frequency: string | null
  points: MacroPoint[]
  latest: MacroPoint | null
  yoyPct: number | null
}

export type MacroEvent = {
  id: string
  kind: string
  title: string
  scheduledAt: string
}

const FRESHNESS_LIMIT = 60 // jours

/** Liste fermée des séries affichées sur /macro, dans l'ordre de présentation. */
export const MACRO_DISPLAY_KEYS = [
  // Liquidité
  "derived:m2_global",
  "derived:net_liquidity",
  "fred:WALCL",
  "fred:WTREGEN",
  "fred:RRPONTSYD",
  "fred:M2SL",
  // Inflation & taux
  "fred:CPIAUCSL",
  "fred:DFEDTARU",
  "fred:DGS10",
  "fred:DGS2",
  "fred:T10Y2Y",
  // Dollar, or, conditions
  "fred:DTWEXBGS",
  "fred:GOLDAMGBD228NLBM",
  "fred:NFCI",
  // Sentiment
  "altme:fng_crypto",
  "cnn:fng_stocks",
] as const

export async function fetchMacroOverview(): Promise<{
  series: MacroSeriesData[]
  upcomingEvents: MacroEvent[]
}> {
  const supabase = await createClient()

  // 5 ans d'historique max — assez pour les courbes, léger en payload
  const since = new Date()
  since.setFullYear(since.getFullYear() - 5)
  const sinceIso = since.toISOString().slice(0, 10)

  const [{ data: seriesRows }, { data: eventsRows }] = await Promise.all([
    supabase
      .from("macro_series")
      .select("id, key, label, unit, frequency")
      .in("key", [...MACRO_DISPLAY_KEYS]),
    supabase
      .from("macro_events")
      .select("id, kind, title, scheduled_at")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(10),
  ])

  // Fetch les points par série en parallèle, paginés pour éviter le cap
  // Supabase de 1000 lignes par requête.
  const pointsBySeries = new Map<string, MacroPoint[]>()
  await Promise.all(
    (seriesRows ?? []).map(async (s) => {
      const acc: MacroPoint[] = []
      const PAGE = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from("macro_points")
          .select("observed_at, value")
          .eq("series_id", s.id)
          .gte("observed_at", sinceIso)
          .order("observed_at", { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) return
        if (!data || data.length === 0) break
        for (const p of data) {
          acc.push({ date: p.observed_at, value: Number(p.value) })
        }
        if (data.length < PAGE) break
        from += PAGE
      }
      pointsBySeries.set(s.id, acc)
    }),
  )

  // Reconstruit la liste dans l'ordre `MACRO_DISPLAY_KEYS`
  const byKey = new Map((seriesRows ?? []).map((s) => [s.key, s]))
  const series: MacroSeriesData[] = MACRO_DISPLAY_KEYS.flatMap((key) => {
    const s = byKey.get(key)
    if (!s) return []
    const points = pointsBySeries.get(s.id) ?? []
    const latest = points.length > 0 ? points[points.length - 1] : null
    return [
      {
        key: s.key,
        label: s.label,
        unit: s.unit,
        frequency: s.frequency,
        points,
        latest,
        yoyPct: computeYoY(points, latest),
      },
    ]
  })

  const upcomingEvents: MacroEvent[] = (eventsRows ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    scheduledAt: e.scheduled_at,
  }))

  return { series, upcomingEvents }
}

function computeYoY(points: MacroPoint[], latest: MacroPoint | null): number | null {
  if (!latest || points.length < 2) return null
  const target = new Date(latest.date)
  target.setFullYear(target.getFullYear() - 1)
  const targetMonth = target.toISOString().slice(0, 7) // YYYY-MM
  const prior = points.find((p) => p.date.startsWith(targetMonth))
  if (!prior || prior.value === 0) return null
  return ((latest.value - prior.value) / prior.value) * 100
}

export function isStale(latest: MacroPoint | null, freshnessLimit = FRESHNESS_LIMIT): boolean {
  if (!latest) return true
  const d = new Date(latest.date)
  const ageDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
  return ageDays > freshnessLimit
}
