/** Formatters i18n FR (PRD défaut). Utilisés partout pour cohérence. */

const moneyFmt = new Map<string, Intl.NumberFormat>()
const pctFmt = new Intl.NumberFormat("fr-CA", {
  style: "percent",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})
const intFmt = new Intl.NumberFormat("fr-CA")

export function formatMoney(value: number | null, currency = "CAD"): string {
  if (value === null) return "—"
  let f = moneyFmt.get(currency)
  if (!f) {
    f = new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 2,
    })
    moneyFmt.set(currency, f)
  }
  return f.format(value)
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—"
  return pctFmt.format(value / 100)
}

export function formatNumber(value: number | null, digits = 0): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatQuantity(value: number | null): string {
  if (value === null) return "—"
  // Affiche les fractions si présentes, sinon entier propre
  const isInt = Number.isInteger(value)
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInt ? 0 : 6,
  }).format(value)
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

export function pnlClass(value: number | null): string {
  if (value === null || value === 0) return "text-muted-strong"
  return value > 0 ? "text-gain" : "text-loss"
}

export { intFmt }
