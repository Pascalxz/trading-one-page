/**
 * Agent macro : interroge FRED pour les séries configurées et écrit dans
 * `macro_points`. Idempotent (upsert sur (series_id, observed_at)).
 * Garde la dernière valeur connue en cas d'échec partiel — pas d'écran blanc.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchFredObservations, type FredObservation } from "@/lib/sources/fred"
import { requireEnv, optionalEnv } from "@/lib/env"
import type { Database } from "@/lib/types/database"
import { computeAndStoreM2Global, type M2GlobalResult } from "./m2-global"

export type MacroRefreshResult = {
  ok: boolean
  series: {
    key: string
    fetched: number
    inserted: number
    error?: string
  }[]
  totalInserted: number
  durationMs: number
  m2_global?: M2GlobalResult
}

/**
 * Crée un client Supabase service_role qui contourne RLS (les tables macro
 * sont en lecture publique, l'écriture passe par le service role).
 */
function getServiceClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey =
    optionalEnv("SUPABASE_SERVICE_ROLE_KEY") ?? optionalEnv("SUPABASE_SECRET_KEY")
  if (!serviceKey) {
    throw new Error(
      "Variable manquante : SUPABASE_SERVICE_ROLE_KEY. Settings → API → service_role.",
    )
  }
  return createServiceClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function refreshMacroSeries(): Promise<MacroRefreshResult> {
  const start = Date.now()
  const supabase = getServiceClient()

  const { data: series, error: seriesErr } = await supabase
    .from("macro_series")
    .select("id, key, metadata")
    .eq("source", "fred")

  if (seriesErr || !series) {
    throw new Error(seriesErr?.message ?? "Aucune série macro à rafraîchir.")
  }

  const results: MacroRefreshResult["series"] = []
  let totalInserted = 0

  for (const s of series) {
    const meta = (s.metadata ?? {}) as { fred_id?: string }
    const fredId = meta.fred_id
    if (!fredId) {
      results.push({ key: s.key, fetched: 0, inserted: 0, error: "metadata.fred_id manquant" })
      continue
    }

    try {
      const obs = await fetchFredObservations(fredId, { sortOrder: "asc" })
      const inserted = await upsertPoints(supabase, s.id, obs)
      results.push({ key: s.key, fetched: obs.length, inserted })
      totalInserted += inserted
    } catch (e) {
      results.push({
        key: s.key,
        fetched: 0,
        inserted: 0,
        error: e instanceof Error ? e.message : "Erreur inconnue",
      })
    }
  }

  // Calcul de la série dérivée M2 global après le fetch FRED (best-effort —
  // n'échoue pas tout le refresh si le calcul plante).
  let m2Global: M2GlobalResult | undefined
  try {
    m2Global = await computeAndStoreM2Global(supabase)
  } catch (e) {
    m2Global = {
      ok: false,
      computed_points: 0,
      missing_components: [],
      error: e instanceof Error ? e.message : "m2_global compute error",
    }
  }

  return {
    ok: results.every((r) => !r.error) && (m2Global?.ok ?? true),
    series: results,
    totalInserted,
    durationMs: Date.now() - start,
    m2_global: m2Global,
  }
}

async function upsertPoints(
  supabase: ReturnType<typeof getServiceClient>,
  seriesId: string,
  obs: FredObservation[],
): Promise<number> {
  if (obs.length === 0) return 0
  const payload = obs.map((o) => ({
    series_id: seriesId,
    observed_at: o.date,
    value: o.value,
  }))
  // Postgres upsert en lot (batchs de 1000 pour éviter les payloads massifs)
  const BATCH = 1000
  let total = 0
  for (let i = 0; i < payload.length; i += BATCH) {
    const slice = payload.slice(i, i + BATCH)
    const { error } = await supabase
      .from("macro_points")
      .upsert(slice, { onConflict: "series_id,observed_at" })
    if (error) throw new Error(`upsert macro_points : ${error.message}`)
    total += slice.length
  }
  return total
}
