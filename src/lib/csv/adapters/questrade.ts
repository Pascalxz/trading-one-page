/**
 * Adaptateur Questrade : mapping des colonnes du relevé CSV vers un modèle
 * interne typé. Format de référence : PRD §5.1 + fixture
 * `src/lib/csv/__fixtures__/questrade-sample.csv`.
 *
 * Particularités observées :
 * - Encodage ISO-8859-1 (à décoder côté upload)
 * - Séparateur ;
 * - Décimales avec point
 * - Pourcentages avec suffixe % (ex: "-0.19%")
 * - Champs vides nombreux (intérêt couru, variations sur titres morts)
 * - Plusieurs comptes dans un même fichier
 */

import { dec, toNumber } from "@/lib/finance/decimal"
import { parseCsv, type CsvRow } from "@/lib/csv/parse"

export type ParsedHolding = {
  accountExternalId: string
  accountCurrency: string
  symbol: string
  description: string | null
  quantity: number
  avgCost: number | null
  bookValue: number | null
  marketPrice: number | null
  dayChangeAmount: number | null
  dayChangePct: number | null
  marketValue: number | null
  dayChange: number | null
  accruedInterest: number | null
  unrealizedPnl: number | null
  unrealizedPnlPct: number | null
  borrowValue: number | null
  isZombie: boolean
  raw: CsvRow
}

export type ParsedAccount = {
  externalId: string
  currency: string
}

export type QuestradeParseResult = {
  accounts: ParsedAccount[]
  holdings: ParsedHolding[]
  warnings: string[]
}

const COLS = {
  account:        "Numéro de compte",
  currency:       "Devise du compte",
  symbol:         "Symbole",
  description:    "Description",
  quantity:       "Quantité",
  avgCost:        "Coût unitaire moyen",
  bookValue:      "Valeur d'acquisition",
  marketPrice:    "Prix du marché",
  dayChangeAmt:   "Variation du jour $",
  dayChangePct:   "Variation du jour %",
  marketValue:    "Valeur marchande",
  dayChange:      "Variation du jour",
  accruedInterest:"Intérêt couru",
  unrealizedPnl:  "Gain/Perte Non réalisé",
  unrealizedPnlPct:"Gain/Perte Non réalisé %",
  borrowValue:    "Valeur d'emprunt",
} as const

export function parseQuestradeCsv(text: string): QuestradeParseResult {
  const { headers, rows } = parseCsv(text, { separator: ";" })

  const warnings: string[] = []
  const requiredCols = [COLS.account, COLS.symbol, COLS.quantity]
  for (const required of requiredCols) {
    if (!headers.includes(required)) {
      warnings.push(`Colonne manquante : « ${required} ». Le fichier n'a pas l'air d'un export Questrade.`)
    }
  }

  const accountsMap = new Map<string, ParsedAccount>()
  const holdings: ParsedHolding[] = []

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    const externalId = row[COLS.account]?.trim()
    const currency = row[COLS.currency]?.trim().toUpperCase()
    const symbol = row[COLS.symbol]?.trim()

    if (!externalId || !symbol) {
      warnings.push(`Ligne ${idx + 2} ignorée : compte ou symbole vide.`)
      continue
    }

    if (currency && !accountsMap.has(externalId)) {
      accountsMap.set(externalId, { externalId, currency })
    }

    const quantity = toNumber(dec(row[COLS.quantity])) ?? 0
    const unrealizedPnlPct = parsePercent(row[COLS.unrealizedPnlPct])
    const marketValue = toNumber(dec(row[COLS.marketValue]))

    holdings.push({
      accountExternalId: externalId,
      accountCurrency: currency || "CAD",
      symbol,
      description: row[COLS.description]?.trim() || null,
      quantity,
      avgCost: toNumber(dec(row[COLS.avgCost])),
      bookValue: toNumber(dec(row[COLS.bookValue])),
      marketPrice: toNumber(dec(row[COLS.marketPrice])),
      dayChangeAmount: toNumber(dec(row[COLS.dayChangeAmt])),
      dayChangePct: parsePercent(row[COLS.dayChangePct]),
      marketValue,
      dayChange: toNumber(dec(row[COLS.dayChange])),
      accruedInterest: toNumber(dec(row[COLS.accruedInterest])),
      unrealizedPnl: toNumber(dec(row[COLS.unrealizedPnl])),
      unrealizedPnlPct,
      borrowValue: toNumber(dec(row[COLS.borrowValue])),
      isZombie: detectZombie({
        unrealizedPnlPct: unrealizedPnlPct,
        marketValue,
        quantity,
      }),
      raw: row,
    })
  }

  return { accounts: [...accountsMap.values()], holdings, warnings }
}

/** Parse "−12.34%" → -12.34, "" → null, "12.34" → 12.34. */
function parsePercent(input: string | undefined | null): number | null {
  if (!input) return null
  const cleaned = input.replace(/%/g, "").trim()
  if (cleaned === "") return null
  const d = dec(cleaned)
  return d === null ? null : d.toNumber()
}

/**
 * Détecte une position "zombie" (PRD §4.1) : G/P ≈ -100% ET valeur ≈ 0.
 * Cas observé : PQEFF (Petroteq) avec -100.00% et marketValue 0.
 */
function detectZombie(args: {
  unrealizedPnlPct: number | null
  marketValue: number | null
  quantity: number
}): boolean {
  if (args.quantity <= 0) return false
  const pctClose = args.unrealizedPnlPct !== null && args.unrealizedPnlPct <= -99
  const valueClose = args.marketValue !== null && args.marketValue < 1
  return pctClose && valueClose
}

// Utilitaire pour tests
export const __cols = COLS
