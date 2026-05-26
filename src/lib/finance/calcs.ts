import { Decimal, dec, toNumber } from "./decimal"

export type HoldingValue = {
  symbol: string
  /** Valeur marchande dans la devise du compte. */
  marketValue: number | null
  /** Devise de la valeur marchande. */
  currency: string
  /** Coût d'acquisition dans la devise du compte. */
  bookValue?: number | null
  unrealizedPnl?: number | null
  themeId?: string | null
  themeName?: string | null
}

export type FxRates = Record<string, number> // ex. { USDCAD: 1.36, EURCAD: 1.46 }

/**
 * Convertit un montant d'une devise vers la devise de référence via une
 * table de taux. Cherche `${from}${to}` puis l'inverse `${to}${from}`.
 */
export function convertAmount(
  amount: number | null,
  from: string,
  to: string,
  rates: FxRates,
): number | null {
  if (amount === null) return null
  if (from === to) return amount
  const direct = rates[`${from}${to}`]
  if (typeof direct === "number") {
    return toNumber(dec(amount)!.times(direct))
  }
  const inverse = rates[`${to}${from}`]
  if (typeof inverse === "number" && inverse !== 0) {
    return toNumber(dec(amount)!.div(inverse))
  }
  return null
}

export type PortfolioTotals = {
  totalMarketValue: number
  totalBookValue: number
  totalUnrealizedPnl: number
  totalUnrealizedPnlPct: number | null
  currency: string
}

/**
 * Totaux du portefeuille convertis dans la devise de référence.
 * Les positions sans valeur marchande comptent pour 0 (zombies, par ex).
 */
export function computeTotals(
  holdings: HoldingValue[],
  referenceCurrency: string,
  rates: FxRates,
): PortfolioTotals {
  let mv = new Decimal(0)
  let bv = new Decimal(0)
  let pnl = new Decimal(0)

  for (const h of holdings) {
    const mvConv = convertAmount(h.marketValue ?? 0, h.currency, referenceCurrency, rates)
    const bvConv = convertAmount(h.bookValue ?? 0, h.currency, referenceCurrency, rates)
    const pnlConv = convertAmount(h.unrealizedPnl ?? 0, h.currency, referenceCurrency, rates)

    if (mvConv !== null) mv = mv.plus(mvConv)
    if (bvConv !== null) bv = bv.plus(bvConv)
    if (pnlConv !== null) pnl = pnl.plus(pnlConv)
  }

  const pct = bv.isZero() ? null : pnl.div(bv).times(100).toNumber()

  return {
    totalMarketValue: mv.toNumber(),
    totalBookValue: bv.toNumber(),
    totalUnrealizedPnl: pnl.toNumber(),
    totalUnrealizedPnlPct: pct,
    currency: referenceCurrency,
  }
}

export type WeightedHolding<H extends HoldingValue> = H & {
  marketValueRef: number | null
  weight: number | null
}

/**
 * Ajoute le poids (% du portefeuille) à chaque position, calculé sur la
 * valeur marchande convertie en devise de référence.
 */
export function withWeights<H extends HoldingValue>(
  holdings: H[],
  referenceCurrency: string,
  rates: FxRates,
): { items: WeightedHolding<H>[]; total: number } {
  const converted = holdings.map((h) => {
    const mvRef = convertAmount(h.marketValue ?? 0, h.currency, referenceCurrency, rates)
    return { h, mvRef }
  })

  const total = converted.reduce<Decimal>(
    (acc, { mvRef }) => (mvRef === null ? acc : acc.plus(mvRef)),
    new Decimal(0),
  )
  const totalNum = total.toNumber()

  const items: WeightedHolding<H>[] = converted.map(({ h, mvRef }) => ({
    ...h,
    marketValueRef: mvRef,
    weight: total.isZero() || mvRef === null
      ? null
      : new Decimal(mvRef).div(total).times(100).toNumber(),
  }))

  return { items, total: totalNum }
}

export type ThemeAllocation = {
  themeId: string | null
  themeName: string
  marketValueRef: number
  weight: number
  count: number
}

/**
 * Agrège par thème (themeId null → bucket "Sans thème").
 */
export function allocationByTheme(
  holdings: HoldingValue[],
  referenceCurrency: string,
  rates: FxRates,
): ThemeAllocation[] {
  const buckets = new Map<string, { name: string; total: Decimal; count: number }>()

  for (const h of holdings) {
    const mv = convertAmount(h.marketValue ?? 0, h.currency, referenceCurrency, rates)
    if (mv === null) continue
    const key = h.themeId ?? "__none__"
    const name = h.themeName ?? "Sans thème"
    const bucket = buckets.get(key) ?? { name, total: new Decimal(0), count: 0 }
    bucket.total = bucket.total.plus(mv)
    bucket.count += 1
    buckets.set(key, bucket)
  }

  const grandTotal = [...buckets.values()].reduce<Decimal>(
    (acc, b) => acc.plus(b.total),
    new Decimal(0),
  )

  return [...buckets.entries()]
    .map(([key, b]) => ({
      themeId: key === "__none__" ? null : key,
      themeName: b.name,
      marketValueRef: b.total.toNumber(),
      weight: grandTotal.isZero() ? 0 : b.total.div(grandTotal).times(100).toNumber(),
      count: b.count,
    }))
    .sort((a, b) => b.marketValueRef - a.marketValueRef)
}
