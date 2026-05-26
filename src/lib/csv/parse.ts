/**
 * Parser CSV minimaliste mais correct pour les exports courtiers.
 * - Séparateur configurable (défaut `;` pour Questrade)
 * - Guillemets doubles autour des valeurs ("...") avec échappement par "" doublés
 * - Tolère les champs vides (`;;`)
 * - Renvoie des records {colonneNormalisée: string}
 */

export type CsvRow = Record<string, string>

export type CsvParseOptions = {
  separator?: string
  /** Si true, la première ligne définit les noms de colonne. Défaut true. */
  hasHeader?: boolean
  /** Normalisation des noms de colonne (défaut: trim). */
  normalizeHeader?: (h: string) => string
}

export function parseCsv(
  text: string,
  opts: CsvParseOptions = {},
): { headers: string[]; rows: CsvRow[] } {
  const separator = opts.separator ?? ";"
  const hasHeader = opts.hasHeader ?? true
  const normalize = opts.normalizeHeader ?? ((h: string) => h.trim())

  // Normaliser les fins de ligne (gère \r\n, \r, \n)
  const normalized = text.replace(/﻿/, "").replace(/\r\n?/g, "\n")
  const records = tokenize(normalized, separator)

  if (records.length === 0) return { headers: [], rows: [] }

  let headers: string[] = []
  let dataStart = 0
  if (hasHeader) {
    headers = records[0].map(normalize)
    dataStart = 1
  } else {
    headers = records[0].map((_, i) => `col${i}`)
  }

  const rows: CsvRow[] = []
  for (let i = dataStart; i < records.length; i++) {
    const cells = records[i]
    // Lignes complètement vides → ignorer
    if (cells.length === 1 && cells[0] === "") continue
    const row: CsvRow = {}
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = cells[c] ?? ""
    }
    rows.push(row)
  }

  return { headers, rows }
}

/**
 * Tokenise un CSV en respectant les guillemets et l'échappement "".
 * Retourne un tableau de lignes, chaque ligne = tableau de cellules.
 */
function tokenize(text: string, sep: string): string[][] {
  const lines: string[][] = []
  let cell = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"' && cell === "") {
      inQuotes = true
      continue
    }

    if (ch === sep) {
      row.push(cell)
      cell = ""
      continue
    }

    if (ch === "\n") {
      row.push(cell)
      lines.push(row)
      cell = ""
      row = []
      continue
    }

    cell += ch
  }

  // Dernière ligne sans \n final
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    lines.push(row)
  }

  return lines
}
