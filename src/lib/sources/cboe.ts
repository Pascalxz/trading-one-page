/**
 * Adaptateur CBOE CSV (https://cdn.cboe.com/api/global/us_indices/daily_prices/).
 *
 * Endpoints CSV publics, ~5 ans d'historique daily :
 *   - SKEW         : SKEW_History.csv
 *   - VIX (alt)    : VIX_History.csv
 *   - Put/Call     : equity_pc.csv, index_pc.csv (format variable selon CBOE)
 *
 * Format SKEW : "DATE,SKEW" (header). DATE: M/D/YYYY ou ISO.
 * Format Put/Call : "DATE,CALL,PUT,TOTAL,P/C Ratio"
 */

export type CboePoint = {
  date: string // YYYY-MM-DD
  value: number
}

const BASE = "https://cdn.cboe.com/api/global/us_indices/daily_prices"

async function fetchCsv(url: string): Promise<string[][]> {
  const res = await fetch(url, {
    headers: {
      Accept: "text/csv,*/*",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    throw new Error(`CBOE ${url.slice(url.lastIndexOf("/") + 1)} ${res.status}`)
  }
  const text = await res.text()
  const lines = text.trim().split(/\r?\n/)
  return lines.map((l) => splitCsvLine(l))
}

function splitCsvLine(line: string): string[] {
  // Simple CSV splitter (CBOE n'a pas de virgules dans les valeurs).
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
}

/** Normalise une date "M/D/YYYY" ou "YYYY-MM-DD" en "YYYY-MM-DD". */
function normalizeDate(raw: string): string | null {
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, mm, dd, yyyy] = m
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
}

export async function fetchCboeSkew(): Promise<CboePoint[]> {
  // Le fichier SKEW comprend généralement un bloc d'en-têtes/commentaires sur
  // les premières lignes, suivi du header "DATE,SKEW".
  const rows = await fetchCsv(`${BASE}/SKEW_History.csv`)
  return rowsToPoints(rows, /^date$/i, /^skew$/i)
}

/** Put/Call ratio CBOE. Le ratio est la dernière colonne "P/C Ratio". */
export async function fetchCboePcr(scope: "equity" | "index"): Promise<CboePoint[]> {
  const file = scope === "equity" ? "equity_pc.csv" : "index_pc.csv"
  const rows = await fetchCsv(`${BASE}/${file}`)
  // Le header est typiquement "Date,Call,Put,Total,P/C Ratio"
  return rowsToPoints(rows, /^date$/i, /p.?c.?ratio|^ratio$/i)
}

function rowsToPoints(
  rows: string[][],
  dateMatcher: RegExp,
  valueMatcher: RegExp,
): CboePoint[] {
  let dateIdx = -1
  let valueIdx = -1
  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const dIdx = r.findIndex((c) => dateMatcher.test(c))
    const vIdx = r.findIndex((c) => valueMatcher.test(c))
    if (dIdx !== -1 && vIdx !== -1) {
      dateIdx = dIdx
      valueIdx = vIdx
      headerRow = i
      break
    }
  }
  if (headerRow === -1) return []

  const byDate = new Map<string, number>()
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length <= Math.max(dateIdx, valueIdx)) continue
    const date = normalizeDate(r[dateIdx])
    const value = Number(r[valueIdx])
    if (!date || !Number.isFinite(value)) continue
    byDate.set(date, value)
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
