/**
 * Adaptateur CoinGecko API.
 *
 * Tier gratuit (sans clé) : ~10-30 req/min, cache 1 min côté CoinGecko.
 * Avec clé Demo (COINGECKO_API_KEY) : header `x-cg-demo-api-key`, ~30 req/min.
 *
 * Docs : https://docs.coingecko.com/reference
 */

import { optionalEnv } from "@/lib/env"

const BASE_FREE = "https://api.coingecko.com/api/v3"
const BASE_DEMO = "https://api.coingecko.com/api/v3" // mêmes endpoints, header différent

export type CoinGeckoMarket = {
  id: string
  symbol: string
  name: string
  current_price: number | null
  market_cap: number | null
  market_cap_rank: number | null
  total_volume: number | null
  price_change_percentage_24h: number | null
  price_change_percentage_7d_in_currency: number | null
  price_change_percentage_30d_in_currency: number | null
  last_updated: string
}

function headers() {
  const key = optionalEnv("COINGECKO_API_KEY")
  const h: Record<string, string> = { Accept: "application/json" }
  if (key) h["x-cg-demo-api-key"] = key
  return h
}

/**
 * Récupère les données marché actuelles pour une liste d'IDs CoinGecko.
 * vsCurrency : devise de référence pour les prix (par défaut 'usd').
 */
export async function fetchMarkets(
  ids: string[],
  vsCurrency = "usd",
): Promise<CoinGeckoMarket[]> {
  if (ids.length === 0) return []
  const url = new URL(`${BASE_FREE}/coins/markets`)
  url.searchParams.set("vs_currency", vsCurrency)
  url.searchParams.set("ids", ids.join(","))
  url.searchParams.set("price_change_percentage", "24h,7d,30d")
  url.searchParams.set("per_page", String(ids.length))

  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 300 }, // cache 5 min côté Vercel
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`CoinGecko markets ${res.status} : ${body.slice(0, 200)}`)
  }
  return (await res.json()) as CoinGeckoMarket[]
}

export type CoinGeckoChartPoint = { date: string; price: number }

/**
 * Récupère l'historique du prix d'un actif sur N jours.
 * Granularité auto : daily si days > 90, hourly si days ≤ 90.
 */
export async function fetchMarketChart(
  id: string,
  days: number,
  vsCurrency = "usd",
): Promise<CoinGeckoChartPoint[]> {
  const url = new URL(`${BASE_DEMO}/coins/${encodeURIComponent(id)}/market_chart`)
  url.searchParams.set("vs_currency", vsCurrency)
  url.searchParams.set("days", String(days))
  if (days > 1 && days <= 90) {
    // L'API libre limite l'intervalle, on prend ce qu'elle renvoie
  }

  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 3600 }, // cache 1h côté Vercel
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`CoinGecko chart ${id} ${res.status} : ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as { prices: [number, number][] }
  return (data.prices ?? []).map(([ts, price]) => ({
    date: new Date(ts).toISOString().slice(0, 10),
    price,
  }))
}
