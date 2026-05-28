/**
 * Adaptateur Bybit public REST v5 — funding rate & open interest perpetuals.
 *
 * Funding rate : https://api.bybit.com/v5/market/funding/history
 *   ?category=linear&symbol=BTCUSDT&limit=200
 *   Cadence 8h. On agrège en moyenne quotidienne.
 *
 * Open interest : https://api.bybit.com/v5/market/open-interest
 *   ?category=linear&symbol=BTCUSDT&intervalTime=1d&limit=200
 *   Daily close OI en contrats.
 */

export type SeriesPoint = {
  date: string // YYYY-MM-DD UTC
  value: number
}

const BASE = "https://api.bybit.com"

type BybitFundingRow = {
  symbol: string
  fundingRate: string
  fundingRateTimestamp: string
}
type BybitOiRow = {
  openInterest: string
  timestamp: string
}

export async function fetchBybitFundingDaily(symbol: string): Promise<SeriesPoint[]> {
  // limit=200 = ~66 jours d'historique. On répète pour ~5 ans en suivant le
  // curseur cursor (next page = endTime du dernier batch - 1).
  const out: SeriesPoint[] = []
  const byDate = new Map<string, { sum: number; count: number }>()
  let endTime: number | undefined
  const FIVE_YEARS_AGO = Date.now() - 5 * 365 * 86_400_000
  let pages = 0
  while (pages < 50) {
    const url = new URL(`${BASE}/v5/market/funding/history`)
    url.searchParams.set("category", "linear")
    url.searchParams.set("symbol", symbol)
    url.searchParams.set("limit", "200")
    if (endTime) url.searchParams.set("endTime", String(endTime))

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`Bybit funding ${symbol} ${res.status}`)
    const json = (await res.json()) as { result?: { list?: BybitFundingRow[] } }
    const rows = json.result?.list ?? []
    if (rows.length === 0) break
    let oldest = Infinity
    for (const r of rows) {
      const ts = Number(r.fundingRateTimestamp)
      const v = Number(r.fundingRate)
      if (!Number.isFinite(ts) || !Number.isFinite(v)) continue
      if (ts < oldest) oldest = ts
      const date = new Date(ts).toISOString().slice(0, 10)
      const agg = byDate.get(date) ?? { sum: 0, count: 0 }
      agg.sum += v
      agg.count += 1
      byDate.set(date, agg)
    }
    if (oldest < FIVE_YEARS_AGO) break
    endTime = oldest - 1
    pages++
  }
  for (const [date, agg] of byDate) {
    // Moyenne pondérée par nb d'observations (8h x 3 = 3 obs/jour normalement)
    out.push({ date, value: (agg.sum / agg.count) * 100 }) // → %
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchBybitOpenInterestDaily(symbol: string): Promise<SeriesPoint[]> {
  // intervalTime=1d, limit=200 = ~6 mois. Bybit ne donne pas 5 ans (limite ~200).
  const url = new URL(`${BASE}/v5/market/open-interest`)
  url.searchParams.set("category", "linear")
  url.searchParams.set("symbol", symbol)
  url.searchParams.set("intervalTime", "1d")
  url.searchParams.set("limit", "200")
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Bybit OI ${symbol} ${res.status}`)
  const json = (await res.json()) as { result?: { list?: BybitOiRow[] } }
  const rows = json.result?.list ?? []
  const byDate = new Map<string, number>()
  for (const r of rows) {
    const ts = Number(r.timestamp)
    const v = Number(r.openInterest)
    if (!Number.isFinite(ts) || !Number.isFinite(v)) continue
    const date = new Date(ts).toISOString().slice(0, 10)
    byDate.set(date, v)
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
