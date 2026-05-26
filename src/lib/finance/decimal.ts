import Decimal from "decimal.js-light"

/**
 * Helpers décimaux pour les calculs monétaires.
 * On évite tout calcul direct sur Number (PRD §7).
 */

Decimal.set({ precision: 28, rounding: 4 })

/** Convertit une valeur (string, number, null) en Decimal ou null. */
export function dec(value: string | number | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return new Decimal(value)
  }
  const trimmed = value.trim()
  if (trimmed === "") return null
  try {
    return new Decimal(trimmed)
  } catch {
    return null
  }
}

/** Convertit en number pour stockage/affichage (perte de précision tolérée à la frontière). */
export function toNumber(d: Decimal | null): number | null {
  return d === null ? null : d.toNumber()
}

/** Convertit en string avec N décimales (sans notation scientifique). */
export function toFixed(d: Decimal | null, places: number): string | null {
  return d === null ? null : d.toFixed(places)
}

export { Decimal }
