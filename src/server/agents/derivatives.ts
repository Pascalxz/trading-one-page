/**
 * Agent dérivés : volatilité implicite (Stooq MOVE, Deribit DVOL), skew &
 * put/call (CBOE), perpetuals crypto (Bybit), positionnement COT (CFTC).
 *
 * VIX est récupéré via FRED (source = "fred") → géré par macro.ts standard.
 *
 * Chaque source est best-effort : si une plante (rate limit, geo-block,
 * format CSV qui change), les autres continuent.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { fetchDeribitDvol } from "@/lib/sources/deribit"
import { fetchCboeSkew } from "@/lib/sources/cboe"
import { fetchOkxFundingDaily, fetchOkxOpenInterestDaily } from "@/lib/sources/okx"
import { fetchCotDisaggregatedNet, fetchCotTffNet } from "@/lib/sources/cftc"

export type DerivativesResult = {
  ok: boolean
  sources: {
    key: string
    fetched: number
    inserted: number
    error?: string
  }[]
}

type Point = { date: string; value: number }

type Source = {
  key: string
  fetcher: () => Promise<Point[]>
}

const SOURCES: Source[] = [
  // Volatilité implicite (hors VIX qui passe par FRED)
  // Note : MOVE (Yahoo) retiré — Yahoo géo-bloque les IP datacenter Vercel.
  { key: "deribit:dvol_btc",   fetcher: () => fetchDeribitDvol("BTC") },
  { key: "deribit:dvol_eth",   fetcher: () => fetchDeribitDvol("ETH") },
  // Skew (CBOE put/call retiré : pas de CSV public stable)
  { key: "cboe:skew",          fetcher: () => fetchCboeSkew() },
  // Perpetuals crypto via OKX (Bybit géo-bloque les IP datacenter US)
  { key: "okx:funding_btc",    fetcher: () => fetchOkxFundingDaily("BTC-USDT-SWAP") },
  { key: "okx:funding_eth",    fetcher: () => fetchOkxFundingDaily("ETH-USDT-SWAP") },
  { key: "okx:oi_btc",         fetcher: () => fetchOkxOpenInterestDaily("BTC") },
  { key: "okx:oi_eth",         fetcher: () => fetchOkxOpenInterestDaily("ETH") },
  // COT (CFTC)
  { key: "cftc:cot_net_gold",  fetcher: () => fetchCotDisaggregatedNet("GOLD - COMMODITY EXCHANGE INC.") },
  { key: "cftc:cot_net_sp500", fetcher: () => fetchCotTffNet("E-MINI S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE") },
  { key: "cftc:cot_net_usd",   fetcher: () => fetchCotTffNet("USD INDEX - ICE FUTURES U.S.") },
  { key: "cftc:cot_net_t10",   fetcher: () => fetchCotTffNet("UST 10Y NOTE - CHICAGO BOARD OF TRADE") },
]

export async function refreshDerivatives(
  supabase: SupabaseClient<Database>,
): Promise<DerivativesResult> {
  const { data: rows } = await supabase
    .from("macro_series")
    .select("id, key")
    .in("key", SOURCES.map((s) => s.key))

  const idByKey = new Map((rows ?? []).map((r) => [r.key, r.id]))

  const results: DerivativesResult["sources"] = []

  // Exécuter en parallèle pour gagner du temps (les sources sont indépendantes).
  await Promise.all(
    SOURCES.map(async (src) => {
      const seriesId = idByKey.get(src.key)
      if (!seriesId) {
        results.push({ key: src.key, fetched: 0, inserted: 0, error: "Série non seedée" })
        return
      }
      try {
        const points = await src.fetcher()
        if (points.length === 0) {
          results.push({ key: src.key, fetched: 0, inserted: 0 })
          return
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
          error: e instanceof Error ? e.message : "derivative fetch error",
        })
      }
    }),
  )

  return {
    ok: results.every((r) => !r.error),
    sources: results,
  }
}
