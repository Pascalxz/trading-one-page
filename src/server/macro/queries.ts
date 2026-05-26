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

export async function fetchMacroOverview(): Promise<{
  series: MacroSeriesData[]
  upcomingEvents: MacroEvent[]
}> {
  const supabase = await createClient()

  // 5 ans d'historique max — assez pour les courbes, léger en payload
  const since = new Date()
  since.setFullYear(since.getFullYear() - 5)
  const sinceIso = since.toISOString().slice(0, 10)

  const [{ data: seriesRows }, { data: pointsRows }, { data: eventsRows }] =
    await Promise.all([
      supabase
        .from("macro_series")
        .select("id, key, label, unit, frequency")
        .eq("source", "fred")
        .order("key"),
      supabase
        .from("macro_points")
        .select("series_id, observed_at, value")
        .gte("observed_at", sinceIso)
        .order("observed_at", { ascending: true }),
      supabase
        .from("macro_events")
        .select("id, kind, title, scheduled_at")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10),
    ])

  const pointsBySeries = new Map<string, MacroPoint[]>()
  for (const p of pointsRows ?? []) {
    const arr = pointsBySeries.get(p.series_id) ?? []
    arr.push({ date: p.observed_at, value: Number(p.value) })
    pointsBySeries.set(p.series_id, arr)
  }

  const series: MacroSeriesData[] = (seriesRows ?? []).map((s) => {
    const points = pointsBySeries.get(s.id) ?? []
    const latest = points.length > 0 ? points[points.length - 1] : null
    const yoyPct = computeYoY(points, latest)
    return {
      key: s.key,
      label: s.label,
      unit: s.unit,
      frequency: s.frequency,
      points,
      latest,
      yoyPct,
    }
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
  // Tolère un jour de différence : on cherche le mois exact d'il y a un an
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
