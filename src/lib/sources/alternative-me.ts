/**
 * Adaptateur alternative.me Fear & Greed (Crypto).
 *
 * Endpoint : https://api.alternative.me/fng/?limit=0
 * Gratuit, sans auth, daily. Renvoie l'historique complet (~6 ans).
 * Doc : https://alternative.me/crypto/fear-and-greed-index/
 *
 * Réponse :
 * {
 *   "data": [
 *     {"value":"55","value_classification":"Greed","timestamp":"1700000000", ...}
 *   ]
 * }
 *
 * Note : timestamp Unix en secondes, à convertir en date YYYY-MM-DD UTC.
 */

export type FngPoint = {
  date: string // YYYY-MM-DD
  value: number // 0-100
}

const ENDPOINT = "https://api.alternative.me/fng/?limit=0&format=json"

export async function fetchAlternativeMeFng(): Promise<FngPoint[]> {
  const res = await fetch(ENDPOINT, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`alternative.me F&G ${res.status}`)
  }

  const json = (await res.json()) as {
    data?: { value: string; timestamp: string }[]
  }
  const data = json.data ?? []

  return data
    .map((p) => {
      const ts = Number(p.timestamp)
      if (!Number.isFinite(ts)) return null
      const date = new Date(ts * 1000).toISOString().slice(0, 10)
      const value = Number(p.value)
      if (!Number.isFinite(value)) return null
      return { date, value }
    })
    .filter((p): p is FngPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}
