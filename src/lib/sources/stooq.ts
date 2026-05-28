/**
 * Adaptateur Stooq (https://stooq.com) — fournisseur gratuit de séries
 * historiques. Endpoint CSV : https://stooq.com/q/d/l/?s=SYMBOL&i=d
 * Pas d'auth, daily, ~5-20 ans d'historique.
 *
 * Format CSV : "Date,Open,High,Low,Close,Volume" (en-tête sur ligne 1).
 */

export type StooqPoint = {
  date: string // YYYY-MM-DD
  value: number // close
}

export async function fetchStooqDailyClose(symbol: string): Promise<StooqPoint[]> {
  // Stooq utilise des minuscules et préfixe ^ pour les indices.
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase())}&i=d`
  const res = await fetch(url, {
    headers: { Accept: "text/csv,*/*" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    throw new Error(`Stooq ${symbol} ${res.status}`)
  }
  const text = await res.text()
  if (text.toLowerCase().includes("no data")) {
    return []
  }
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  // Header: Date,Open,High,Low,Close,Volume
  const out: StooqPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",")
    if (cols.length < 5) continue
    const [date, , , , close] = cols
    const v = Number(close)
    if (!Number.isFinite(v)) continue
    out.push({ date, value: v })
  }
  return out
}
