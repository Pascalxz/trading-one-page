/**
 * Adaptateur CNN Fear & Greed (bourse).
 *
 * Endpoint utilisé par cnn.com (non-officiel, mais public et stable depuis
 * plusieurs années) : production.dataviz.cnn.io/index/fearandgreed/graphdata
 *
 * Renvoie ~1 an d'historique daily 0-100. Pas d'auth. Nécessite un
 * User-Agent réaliste sinon CNN renvoie 403.
 *
 * Réponse :
 * {
 *   "fear_and_greed_historical": {
 *     "data": [
 *       {"x": 1700000000000, "y": 35.5, "rating": "fear"}
 *     ]
 *   },
 *   "fear_and_greed": { "score": 42, ... }
 * }
 *
 * timestamp Unix en ms.
 */

export type FngPoint = {
  date: string // YYYY-MM-DD
  value: number // 0-100
}

const ENDPOINT = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"

export async function fetchCnnFng(): Promise<FngPoint[]> {
  const res = await fetch(ENDPOINT, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`CNN F&G ${res.status}`)
  }

  const json = (await res.json()) as {
    fear_and_greed_historical?: { data?: { x: number; y: number }[] }
  }
  const data = json.fear_and_greed_historical?.data ?? []

  const byDate = new Map<string, number>()
  for (const p of data) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    // x est en ms ; on garde une valeur par date UTC (la dernière l'emporte).
    const date = new Date(p.x).toISOString().slice(0, 10)
    byDate.set(date, p.y)
  }

  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
