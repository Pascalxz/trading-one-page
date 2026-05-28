/**
 * Adaptateur Deribit public API — DVOL (implied volatility index).
 *
 * Endpoint :
 *   https://www.deribit.com/api/v2/public/get_volatility_index_data
 *
 * Params :
 *   currency=BTC|ETH
 *   start_timestamp (ms), end_timestamp (ms)
 *   resolution = 1 | 60 | 3600 | 43200 | "1D"
 *
 * Réponse : { result: { data: [[ts_ms, open, high, low, close], ...] } }
 */

export type DvolPoint = {
  date: string // YYYY-MM-DD UTC
  value: number // close
}

const ENDPOINT = "https://www.deribit.com/api/v2/public/get_volatility_index_data"

export async function fetchDeribitDvol(currency: "BTC" | "ETH"): Promise<DvolPoint[]> {
  const end = Date.now()
  // 5 ans d'historique — Deribit DVOL existe depuis ~2021
  const start = end - 5 * 365 * 86_400_000
  const url = new URL(ENDPOINT)
  url.searchParams.set("currency", currency)
  url.searchParams.set("start_timestamp", String(start))
  url.searchParams.set("end_timestamp", String(end))
  url.searchParams.set("resolution", "1D")

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    throw new Error(`Deribit DVOL ${currency} ${res.status}`)
  }
  const json = (await res.json()) as {
    result?: { data?: [number, number, number, number, number][] }
  }
  const rows = json.result?.data ?? []
  const byDate = new Map<string, number>()
  for (const row of rows) {
    const [ts, , , , close] = row
    if (!Number.isFinite(ts) || !Number.isFinite(close)) continue
    const date = new Date(ts).toISOString().slice(0, 10)
    byDate.set(date, close)
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
