/**
 * Adaptateur Yahoo Finance — endpoint /v8/finance/chart (public, sans auth).
 *
 * URL : https://query1.finance.yahoo.com/v8/finance/chart/SYMBOL
 *   ?period1=0&period2=9999999999&interval=1d
 *
 * Réponse JSON : { chart: { result: [{ timestamp: [...], indicators: {
 *   quote: [{ close: [...] }] } }] } }
 *
 * Note : Yahoo a parfois besoin d'un User-Agent navigateur sinon renvoie 401.
 */

export type YahooPoint = {
  date: string // YYYY-MM-DD UTC
  value: number // adjusted close
}

const BASE = "https://query1.finance.yahoo.com"

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: {
        quote?: Array<{ close?: (number | null)[] }>
        adjclose?: Array<{ adjclose?: (number | null)[] }>
      }
    }>
    error?: { code: string; description: string } | null
  }
}

export async function fetchYahooDailyClose(symbol: string): Promise<YahooPoint[]> {
  const url = new URL(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`)
  url.searchParams.set("period1", "0")
  url.searchParams.set("period2", String(Math.ceil(Date.now() / 1000)))
  url.searchParams.set("interval", "1d")
  url.searchParams.set("events", "history")

  // Yahoo throttle agressivement les IP de datacenter. Retry une fois en cas
  // de 429 (rate limit) ou 5xx.
  let res: Response | undefined
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    })
    if (res.ok) break
    lastStatus = res.status
    if (res.status !== 429 && res.status < 500) break
    // Backoff exponentiel : 2s, 5s
    await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 5000))
  }
  if (!res || !res.ok) throw new Error(`Yahoo ${symbol} ${lastStatus || res?.status}`)
  const json = (await res.json()) as YahooChartResponse
  if (json.chart?.error) {
    throw new Error(`Yahoo ${symbol}: ${json.chart.error.description}`)
  }
  const result = json.chart?.result?.[0]
  if (!result) return []

  const timestamps = result.timestamp ?? []
  // Préfère adjclose s'il existe (ajusté splits/dividendes), sinon close brut
  const closes =
    result.indicators?.adjclose?.[0]?.adjclose ??
    result.indicators?.quote?.[0]?.close ??
    []

  const out: YahooPoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i]
    const v = closes[i]
    if (!Number.isFinite(ts) || v === null || v === undefined || !Number.isFinite(v)) continue
    const date = new Date(ts * 1000).toISOString().slice(0, 10)
    out.push({ date, value: v as number })
  }
  return out
}
