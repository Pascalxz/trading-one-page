/**
 * Net Liquidity = WALCL − TGA − RRP
 *
 * WALCL est hebdomadaire (Wed). TGA (WTREGEN) hebdomadaire (Wed).
 * RRPONTSYD est quotidien. On résout sur les dates de WALCL en prenant pour
 * chaque date :
 *   - TGA à la même semaine (ou closest ≤ 7j)
 *   - RRP au même jour (ou closest ≤ 3j)
 *
 * Tout est en Md USD chez FRED → pas de conversion.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

const KEYS = [
  "fred:WALCL",
  "fred:WTREGEN",
  "fred:RRPONTSYD",
  "derived:net_liquidity",
] as const

type Point = { observed_at: string; value: number }

export type NetLiquidityResult = {
  ok: boolean
  computed_points: number
  missing_components: string[]
  range?: { from: string; to: string }
  error?: string
}

export async function computeAndStoreNetLiquidity(
  supabase: SupabaseClient<Database>,
): Promise<NetLiquidityResult> {
  const { data: series } = await supabase
    .from("macro_series")
    .select("id, key")
    .in("key", [...KEYS])

  if (!series || series.length === 0) {
    return { ok: false, computed_points: 0, missing_components: [], error: "Aucune série trouvée." }
  }

  const idByKey = new Map(series.map((s) => [s.key, s.id]))
  const targetId = idByKey.get("derived:net_liquidity")
  if (!targetId) {
    return {
      ok: false,
      computed_points: 0,
      missing_components: [],
      error: "Série derived:net_liquidity manquante.",
    }
  }

  // Pagination par série pour contourner le cap Supabase 1000 lignes.
  const pointsByKey = new Map<string, Point[]>()
  await Promise.all(
    (["fred:WALCL", "fred:WTREGEN", "fred:RRPONTSYD"] as const).map(async (key) => {
      const id = idByKey.get(key)
      if (!id) {
        pointsByKey.set(key, [])
        return
      }
      const acc: Point[] = []
      const PAGE = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from("macro_points")
          .select("observed_at, value")
          .eq("series_id", id)
          .order("observed_at", { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) return
        if (!data || data.length === 0) break
        for (const p of data) acc.push({ observed_at: p.observed_at, value: Number(p.value) })
        if (data.length < PAGE) break
        from += PAGE
      }
      pointsByKey.set(key, acc)
    }),
  )

  const missing = (["fred:WALCL", "fred:WTREGEN", "fred:RRPONTSYD"] as const).filter(
    (k) => (pointsByKey.get(k)?.length ?? 0) === 0,
  )

  const walcl = pointsByKey.get("fred:WALCL") ?? []
  if (walcl.length === 0) {
    return { ok: false, computed_points: 0, missing_components: missing, error: "WALCL absent." }
  }

  const tga = pointsByKey.get("fred:WTREGEN") ?? []
  const rrp = pointsByKey.get("fred:RRPONTSYD") ?? []

  // Pour chaque date WALCL, on cherche TGA dans ±7j et RRP dans ±3j.
  const out: { observed_at: string; value: number }[] = []
  for (const w of walcl) {
    const tgaVal = pickClosest(tga, w.observed_at, 7)
    const rrpVal = pickClosest(rrp, w.observed_at, 3)
    if (tgaVal === null || rrpVal === null) continue
    out.push({ observed_at: w.observed_at, value: w.value - tgaVal - rrpVal })
  }

  if (out.length === 0) {
    return {
      ok: false,
      computed_points: 0,
      missing_components: missing,
      error: "Aucune date alignable WALCL/TGA/RRP.",
    }
  }

  const BATCH = 500
  for (let i = 0; i < out.length; i += BATCH) {
    const slice = out.slice(i, i + BATCH).map((p) => ({
      series_id: targetId,
      observed_at: p.observed_at,
      value: p.value,
    }))
    const { error } = await supabase
      .from("macro_points")
      .upsert(slice, { onConflict: "series_id,observed_at" })
    if (error) {
      return {
        ok: false,
        computed_points: 0,
        missing_components: missing,
        error: error.message,
      }
    }
  }

  return {
    ok: true,
    computed_points: out.length,
    missing_components: missing,
    range: { from: out[0].observed_at, to: out[out.length - 1].observed_at },
  }
}

function pickClosest(points: Point[], date: string, maxDaysDiff: number): number | null {
  if (points.length === 0) return null
  const t = new Date(date).getTime()
  let best = points[0]
  let bestDiff = Math.abs(new Date(best.observed_at).getTime() - t)
  for (const p of points) {
    const d = Math.abs(new Date(p.observed_at).getTime() - t)
    if (d < bestDiff) {
      best = p
      bestDiff = d
    }
  }
  if (bestDiff > maxDaysDiff * 86_400_000) return null
  return best.value
}
