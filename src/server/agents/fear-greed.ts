/**
 * Agent Fear & Greed : fetch alternative.me (crypto) + CNN (bourse) et
 * upsert dans `macro_points`. Best-effort : si une source échoue (CNN
 * bloque parfois), l'autre continue.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { fetchAlternativeMeFng } from "@/lib/sources/alternative-me"
import { fetchCnnFng } from "@/lib/sources/cnn-fng"

export type FearGreedResult = {
  ok: boolean
  sources: {
    key: string
    fetched: number
    inserted: number
    error?: string
  }[]
}

const SOURCES = [
  { key: "altme:fng_crypto", fetcher: fetchAlternativeMeFng },
  { key: "cnn:fng_stocks", fetcher: fetchCnnFng },
] as const

export async function refreshFearAndGreed(
  supabase: SupabaseClient<Database>,
): Promise<FearGreedResult> {
  const { data: rows } = await supabase
    .from("macro_series")
    .select("id, key")
    .in("key", SOURCES.map((s) => s.key))

  const idByKey = new Map((rows ?? []).map((r) => [r.key, r.id]))

  const results: FearGreedResult["sources"] = []

  for (const src of SOURCES) {
    const seriesId = idByKey.get(src.key)
    if (!seriesId) {
      results.push({ key: src.key, fetched: 0, inserted: 0, error: "Série non seedée" })
      continue
    }
    try {
      const points = await src.fetcher()
      if (points.length === 0) {
        results.push({ key: src.key, fetched: 0, inserted: 0 })
        continue
      }
      const payload = points.map((p) => ({
        series_id: seriesId,
        observed_at: p.date,
        value: p.value,
      }))
      const BATCH = 1000
      let total = 0
      for (let i = 0; i < payload.length; i += BATCH) {
        const slice = payload.slice(i, i + BATCH)
        const { error } = await supabase
          .from("macro_points")
          .upsert(slice, { onConflict: "series_id,observed_at" })
        if (error) throw new Error(error.message)
        total += slice.length
      }
      results.push({ key: src.key, fetched: points.length, inserted: total })
    } catch (e) {
      results.push({
        key: src.key,
        fetched: 0,
        inserted: 0,
        error: e instanceof Error ? e.message : "fear-greed fetch error",
      })
    }
  }

  return {
    ok: results.every((r) => !r.error),
    sources: results,
  }
}
