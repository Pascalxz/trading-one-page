/**
 * Adaptateur CFTC Commitments of Traders (COT) via Socrata public API.
 *
 * Reports utilisés :
 *  - Disaggregated combined (commodities)  → resource id "72hh-3qpy"
 *    Colonnes nettes : m_money_positions_long_all, m_money_positions_short_all
 *  - Traders in Financial Futures (TFF)    → resource id "gpe5-46if"
 *    Colonnes nettes : lev_money_positions_long, lev_money_positions_short
 *
 * Free, no auth. App token recommandé pour rate limit mais optionnel.
 * Frequence : hebdomadaire (vendredi soir UTC, données du mardi précédent).
 */

export type CotPoint = {
  date: string // YYYY-MM-DD (report date = report_date_as_yyyy_mm_dd)
  value: number // positions nettes (long - short)
}

const SOCRATA = "https://publicreporting.cftc.gov/resource"

/**
 * Fetch Disaggregated COT pour un nom de marché donné, calcule net Managed
 * Money = long - short pour chaque rapport.
 */
export async function fetchCotDisaggregatedNet(marketName: string): Promise<CotPoint[]> {
  const url = new URL(`${SOCRATA}/72hh-3qpy.csv`)
  url.searchParams.set("$select",
    "report_date_as_yyyy_mm_dd, market_and_exchange_names, " +
    "m_money_positions_long_all, m_money_positions_short_all",
  )
  url.searchParams.set("$where", `market_and_exchange_names='${marketName.replace(/'/g, "''")}'`)
  url.searchParams.set("$order", "report_date_as_yyyy_mm_dd ASC")
  url.searchParams.set("$limit", "10000")

  const res = await fetch(url, {
    headers: { Accept: "text/csv" },
    next: { revalidate: 12 * 3600 },
  })
  if (!res.ok) throw new Error(`CFTC disaggregated ${marketName} ${res.status}`)
  const text = await res.text()
  return parseCotCsv(text, "m_money_positions_long_all", "m_money_positions_short_all")
}

/**
 * Fetch TFF COT pour un nom de marché donné, calcule net Leveraged Funds.
 */
export async function fetchCotTffNet(marketName: string): Promise<CotPoint[]> {
  const url = new URL(`${SOCRATA}/gpe5-46if.csv`)
  url.searchParams.set("$select",
    "report_date_as_yyyy_mm_dd, market_and_exchange_names, " +
    "lev_money_positions_long, lev_money_positions_short",
  )
  url.searchParams.set("$where", `market_and_exchange_names='${marketName.replace(/'/g, "''")}'`)
  url.searchParams.set("$order", "report_date_as_yyyy_mm_dd ASC")
  url.searchParams.set("$limit", "10000")

  const res = await fetch(url, {
    headers: { Accept: "text/csv" },
    next: { revalidate: 12 * 3600 },
  })
  if (!res.ok) throw new Error(`CFTC TFF ${marketName} ${res.status}`)
  const text = await res.text()
  return parseCotCsv(text, "lev_money_positions_long", "lev_money_positions_short")
}

function parseCotCsv(text: string, longCol: string, shortCol: string): CotPoint[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  const dateIdx = headers.indexOf("report_date_as_yyyy_mm_dd")
  const lIdx = headers.indexOf(longCol)
  const sIdx = headers.indexOf(shortCol)
  if (dateIdx === -1 || lIdx === -1 || sIdx === -1) return []

  const out: CotPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const rawDate = cols[dateIdx]
    if (!rawDate) continue
    const date = rawDate.slice(0, 10)
    const long = Number(cols[lIdx])
    const short = Number(cols[sIdx])
    if (!Number.isFinite(long) || !Number.isFinite(short)) continue
    out.push({ date, value: long - short })
  }
  return out
}

function parseCsvLine(line: string): string[] {
  // Socrata renvoie du CSV simple (les valeurs avec virgules sont quotées).
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        cur += c
      }
    } else {
      if (c === '"') quoted = true
      else if (c === ",") {
        out.push(cur)
        cur = ""
      } else cur += c
    }
  }
  out.push(cur)
  return out
}
