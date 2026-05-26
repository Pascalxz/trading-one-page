/**
 * Classification déterministe symbole → thème.
 *
 * Couvre les tickers connus de Pascal (et les usuels). Les inconnus restent
 * non classifiés (theme_id = null) et seront traités par l'IA en Phase 4
 * (cf. PRD §4.4 mode 4 — agent:normalize).
 */

/** Slugs de thèmes seedés par 0001_core.sql (handle_new_user). */
export const THEME_SLUGS = {
  miningCrypto: "mining-crypto",
  ai: "ai",
  cryptoEtf: "crypto-etf",
  cryptoL1: "crypto-l1",
  valueBluechip: "value-bluechip",
  speculative: "speculative",
  biotech: "biotech",
  space: "space",
  cash: "cash",
  other: "other",
} as const

export type ThemeSlug = (typeof THEME_SLUGS)[keyof typeof THEME_SLUGS]

/**
 * Mapping explicite — la source de vérité pour les tickers fréquents.
 * Préférer cette map aux heuristiques (plus prévisible).
 */
const EXPLICIT: Record<string, ThemeSlug> = {
  // Mining crypto
  HIVE: "mining-crypto",
  HUT:  "mining-crypto",
  RIOT: "mining-crypto",
  MARA: "mining-crypto",
  CLSK: "mining-crypto",
  BITF: "mining-crypto",
  CIFR: "mining-crypto",
  IREN: "mining-crypto",
  WGMI: "mining-crypto",
  BITQ: "mining-crypto",
  CAN:  "mining-crypto", // Canaan — fabricant ASIC
  CORZ: "mining-crypto",

  // Crypto ETF / proxies
  "ETHX.B": "crypto-etf",
  "BTCX.B": "crypto-etf",
  "BTCC.B": "crypto-etf",
  "BTCC":   "crypto-etf",
  "ETHX":   "crypto-etf",
  "BITO":   "crypto-etf",
  "IBIT":   "crypto-etf",
  "FBTC":   "crypto-etf",
  "GBTC":   "crypto-etf",
  "COIN":   "crypto-etf", // Coinbase — proxy crypto coté

  // Crypto L1/L2 (tokens directs)
  BTC:  "crypto-l1",
  ETH:  "crypto-l1",
  SOL:  "crypto-l1",
  AVAX: "crypto-l1",
  ATOM: "crypto-l1",
  DOT:  "crypto-l1",

  // IA
  PLTR: "ai",
  NVDA: "ai",
  AMD:  "ai",
  SMCI: "ai",
  AI:   "ai",
  SOUN: "ai",
  BBAI: "ai",
  AIQ:  "ai",
  CHAT: "ai",

  // Value / Blue chip
  AAPL: "value-bluechip",
  MSFT: "value-bluechip",
  GOOG: "value-bluechip",
  GOOGL:"value-bluechip",
  AMZN: "value-bluechip",
  META: "value-bluechip",
  NOK:  "value-bluechip",
  KO:   "value-bluechip",
  PEP:  "value-bluechip",
  JPM:  "value-bluechip",
  V:    "value-bluechip",
  MA:   "value-bluechip",
  BABA: "value-bluechip", // ADR chinois, méga-cap

  // Spéculatif / penny
  ACB:   "speculative",
  PQEFF: "speculative",
  PRME:  "speculative",
  IZEA:  "speculative",
  TLRY:  "speculative",
  SNDL:  "speculative",
  HEXO:  "speculative",
  CGC:   "speculative",
  APHA:  "speculative",
  NAKD:  "speculative",
  GME:   "speculative",
  AMC:   "speculative",

  // Biotech
  PACB:  "biotech",
  MRNA:  "biotech",
  PFE:   "biotech",
  BNTX:  "biotech",
  CRSP:  "biotech",
  NTLA:  "biotech",
  ARKG:  "biotech",
  XBI:   "biotech",
  IBB:   "biotech",

  // Espace
  ARKX: "space",
  UFO:  "space",
  RKLB: "space",
  SPCE: "space",
  ASTR: "space",
  IRDM: "space",
  PL:   "space",
  RDW:  "space",

  // Cash equivalents
  CASH: "cash",
  USD:  "cash",
  CAD:  "cash",
  MNY:  "cash",
}

/**
 * Heuristiques appliquées si aucun match explicite.
 * Volontairement conservatrices : un faux positif est pire qu'une absence
 * de classification (l'utilisateur garde la main via le ThemePicker).
 */
function applyHeuristics(symbol: string, description: string | null): ThemeSlug | null {
  const sym = symbol.toUpperCase()
  const desc = (description ?? "").toUpperCase()

  // ETFs ARK gérés par ARK Invest
  if (sym.startsWith("ARK")) {
    if (sym === "ARKG") return "biotech"
    if (sym === "ARKX") return "space"
    if (sym === "ARKQ" || sym === "ARKK" || sym === "ARKF" || sym === "ARKW") return "ai"
    return "other"
  }

  // ETF/ETN avec "BITCOIN" / "ETHER" / "CRYPTO" dans la description
  if (/(BITCOIN|ETHER|ETHEREUM|CRYPTO)/.test(desc) && /(ETF|TRUST|FUND|FUTURES)/.test(desc)) {
    return "crypto-etf"
  }

  // Tokens crypto purs dans la description
  if (/(BITCOIN|ETHEREUM|SOLANA|AVALANCHE|POLKADOT)/.test(desc) && !/ETF|FUND|TRUST/.test(desc)) {
    return "crypto-l1"
  }

  // Biotech / pharma mots-clés
  if (/(PHARMACEUTICAL|PHARMA|BIOTECH|BIOSCIENCE|THERAPEUTIC|GENOMIC)/.test(desc)) {
    return "biotech"
  }

  // Mining / blockchain dans description
  if (/(MINING|BLOCKCHAIN)/.test(desc) && /(DIGITAL|CRYPTO|BITCOIN)/.test(desc)) {
    return "mining-crypto"
  }

  // Aerospace / space
  if (/(SPACE|AEROSPACE|SATELLITE|ROCKET)/.test(desc)) {
    return "space"
  }

  return null
}

/**
 * Classifie un symbole. Retourne le slug du thème ou null si inconnu.
 */
export function classifySymbol(
  symbol: string,
  description: string | null = null,
): ThemeSlug | null {
  const upper = symbol.toUpperCase()
  if (EXPLICIT[upper]) return EXPLICIT[upper]
  if (EXPLICIT[symbol]) return EXPLICIT[symbol]
  return applyHeuristics(symbol, description)
}
