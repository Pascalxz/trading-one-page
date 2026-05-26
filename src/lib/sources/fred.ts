/**
 * Adaptateur FRED API (Federal Reserve Bank of St. Louis).
 *
 * Docs : https://fred.stlouisfed.org/docs/api/fred/
 * Endpoint utilisé : /fred/series/observations (gratuit, clé requise).
 *
 * Conventions :
 * - Réponse JSON `request_type=json`
 * - Les valeurs "." représentent des données manquantes — filtrées
 * - Les dates sont au format ISO (YYYY-MM-DD)
 */

import { requireEnv } from "@/lib/env"

const BASE = "https://api.stlouisfed.org"

export type FredObservation = {
  date: string  // YYYY-MM-DD
  value: number
}

export type FredObservationsOptions = {
  /** Date de début (incluse). Si omis, FRED renvoie tout l'historique. */
  observationStart?: string
  /** Date de fin (incluse). */
  observationEnd?: string
  /** Limite le nombre de points renvoyés. */
  limit?: number
  /** Trie ascendant par défaut (FRED défaut : 'asc'). */
  sortOrder?: "asc" | "desc"
}

/**
 * Récupère les observations historiques d'une série FRED.
 * Throws si la clé n'est pas configurée ou si FRED renvoie une erreur.
 */
export async function fetchFredObservations(
  seriesId: string,
  opts: FredObservationsOptions = {},
): Promise<FredObservation[]> {
  const apiKey = requireEnv("FRED_API_KEY")
  const url = new URL(`${BASE}/fred/series/observations`)
  url.searchParams.set("series_id", seriesId)
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("file_type", "json")
  if (opts.observationStart) url.searchParams.set("observation_start", opts.observationStart)
  if (opts.observationEnd) url.searchParams.set("observation_end", opts.observationEnd)
  if (opts.limit) url.searchParams.set("limit", String(opts.limit))
  if (opts.sortOrder) url.searchParams.set("sort_order", opts.sortOrder)

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Cache 1h côté Vercel pour limiter les appels (les données sont mensuelles)
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`FRED ${seriesId} ${res.status} : ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    observations?: { date: string; value: string }[]
    error_message?: string
  }

  if (data.error_message) {
    throw new Error(`FRED ${seriesId} : ${data.error_message}`)
  }

  return (data.observations ?? [])
    .filter((obs) => obs.value !== "." && obs.value !== "")
    .map((obs) => ({
      date: obs.date,
      value: Number(obs.value),
    }))
    .filter((obs) => Number.isFinite(obs.value))
}

/**
 * Calcule la variation YoY (year-over-year) en pourcentage à partir d'une
 * série de points horodatés. Renvoie une nouvelle série alignée.
 */
export function computeYoY(observations: FredObservation[]): FredObservation[] {
  if (observations.length === 0) return []
  // Index par date pour lookup -1 an
  const byDate = new Map(observations.map((o) => [o.date, o.value]))
  const result: FredObservation[] = []
  for (const obs of observations) {
    const d = new Date(obs.date)
    const yearAgo = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
    const key = yearAgo.toISOString().slice(0, 10)
    const prior = byDate.get(key)
    if (prior !== undefined && prior !== 0) {
      result.push({
        date: obs.date,
        value: ((obs.value - prior) / prior) * 100,
      })
    }
  }
  return result
}
