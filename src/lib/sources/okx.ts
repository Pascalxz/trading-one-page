/**
 * Adaptateur OKX public REST v5 — funding rate & open interest perpetuals.
 *
 * OKX est généralement accessible depuis les IP de datacenter US (Vercel),
 * contrairement à Bybit et Binance qui géo-bloquent ces régions.
 *
 * Funding rate history :
 *   https://www.okx.com/api/v5/public/funding-rate-history
 *     ?instId=BTC-USDT-SWAP&limit=100
 *   Cadence 8h. limit=100 (max). On pagine avec `before` (timestamp ms).
 *
 * Open interest history :
 *   https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume
 *     ?ccy=BTC&period=1D
 *   Retourne [[ts, openInterest_USD, volume_USD], ...]
 *   Période daily, ~6 mois d'historique max.
 */

export type SeriesPoint = {
  date: string // YYYY-MM-DD UTC
  value: number
}

const BASE = "https://www.okx.com"

type OkxFundingRow = {
  fundingRate: string
  fundingTime: string
  instId: string
}

/**
 * Funding rate quotidien moyen pour un swap OKX, en pourcent.
 * Pagine en arrière jusqu'à ~5 ans (ou jusqu'à ce que OKX renvoie vide).
 */
export async function fetchOkxFundingDaily(instId: string): Promise<SeriesPoint[]> {
  const byDate = new Map<string, { sum: number; count: number }>()
  const FIVE_YEARS_AGO = Date.now() - 5 * 365 * 86_400_000
  let before: number | undefined
  for (let page = 0; page < 200; page++) {
    const url = new URL(`${BASE}/api/v5/public/funding-rate-history`)
    url.searchParams.set("instId", instId)
    url.searchParams.set("limit", "100")
    if (before) url.searchParams.set("before", String(before))

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`OKX funding ${instId} ${res.status}`)
    const json = (await res.json()) as { code?: string; msg?: string; data?: OkxFundingRow[] }
    if (json.code && json.code !== "0") throw new Error(`OKX funding ${instId}: ${json.msg ?? json.code}`)
    const rows = json.data ?? []
    if (rows.length === 0) break

    let oldest = Infinity
    for (const r of rows) {
      const ts = Number(r.fundingTime)
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
    // OKX paginate : "before" = ts du plus ancien retourné (exclus)
    before = oldest
  }

  return [...byDate.entries()]
    .map(([date, agg]) => ({ date, value: (agg.sum / agg.count) * 100 })) // → %
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Open interest quotidien d'une crypto (BTC, ETH...) en USD, agrégé sur tous
 * les SWAP perpetuals d'OKX pour ce ticker.
 */
export async function fetchOkxOpenInterestDaily(ccy: string): Promise<SeriesPoint[]> {
  const url = new URL(`${BASE}/api/v5/rubik/stat/contracts/open-interest-volume`)
  url.searchParams.set("ccy", ccy)
  url.searchParams.set("period", "1D")

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`OKX OI ${ccy} ${res.status}`)
  const json = (await res.json()) as { code?: string; msg?: string; data?: string[][] }
  if (json.code && json.code !== "0") throw new Error(`OKX OI ${ccy}: ${json.msg ?? json.code}`)
  const rows = json.data ?? []

  const byDate = new Map<string, number>()
  for (const r of rows) {
    if (r.length < 2) continue
    const ts = Number(r[0])
    const oi = Number(r[1])
    if (!Number.isFinite(ts) || !Number.isFinite(oi)) continue
    const date = new Date(ts).toISOString().slice(0, 10)
    byDate.set(date, oi)
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
