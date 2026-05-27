import "server-only"
import { createClient } from "@/lib/supabase/server"
import { fetchMarkets, type CoinGeckoMarket } from "@/lib/sources/coingecko"

/**
 * Mapping symbole utilisateur (CSV) → protocole de référence.
 * Permet de relier les holdings d'un user à un protocole tracké.
 */
const SYMBOL_TO_PROTOCOL: Record<string, string> = {
  "ETHX.B": "ethereum",
  "ETHX":   "ethereum",
  "BTCX.B": "bitcoin",
  "BTCC.B": "bitcoin",
  "BTCC":   "bitcoin",
  "IBIT":   "bitcoin",
  "FBTC":   "bitcoin",
  "GBTC":   "bitcoin",
  "BITO":   "bitcoin",
  // Mineurs : exposition au prix BTC
  "HIVE":   "bitcoin",
  "HUT":    "bitcoin",
  "RIOT":   "bitcoin",
  "MARA":   "bitcoin",
  "CLSK":   "bitcoin",
  "BITF":   "bitcoin",
  "CAN":    "bitcoin",
  "CIFR":   "bitcoin",
  "IREN":   "bitcoin",
  "CORZ":   "bitcoin",
  // Exchanges/proxies : BTC+ETH
  "COIN":   "bitcoin",
  // Tokens directs
  "BTC":    "bitcoin",
  "ETH":    "ethereum",
  "SOL":    "solana",
  "AVAX":   "avalanche",
  "DOT":    "polkadot",
}

export type ProtocolView = {
  instrumentId: string
  symbol: string                  // ex: 'BTC'
  description: string             // 'Bitcoin'
  protocol: string                // 'bitcoin'
  coingeckoId: string
  githubRepo: string
  market: CoinGeckoMarket | null
  dev: {
    observedOn: string
    commits7d: number | null
    commits30d: number | null
    contributors30d: number | null
    stars: number | null
    lastReleaseTag: string | null
    lastReleaseAt: string | null
  } | null
  /** Tickers utilisateur exposés à ce protocole (parmi les holdings). */
  userExposureSymbols: string[]
}

export async function fetchProtocols(): Promise<ProtocolView[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Instruments crypto trackés
  const { data: instruments } = await supabase
    .from("instruments")
    .select("id, symbol, description, coingecko_id, github_repo, metadata")
    .eq("kind", "crypto")
    .not("coingecko_id", "is", null)
    .order("symbol")

  if (!instruments || instruments.length === 0) return []

  // 2. dev_metrics les plus récentes par instrument
  const instrumentIds = instruments.map((i) => i.id)
  const { data: devRows } = await supabase
    .from("dev_metrics")
    .select(
      "instrument_id, observed_on, commits_7d, commits_30d, contributors_30d, stars, last_release_tag, last_release_at",
    )
    .in("instrument_id", instrumentIds)
    .order("observed_on", { ascending: false })

  const latestDev = new Map<string, NonNullable<typeof devRows>[number]>()
  for (const row of devRows ?? []) {
    if (!latestDev.has(row.instrument_id)) latestDev.set(row.instrument_id, row)
  }

  // 3. Holdings de l'utilisateur (pour l'exposition)
  let userExposureByProtocol = new Map<string, Set<string>>()
  if (user) {
    const { data: holdings } = await supabase
      .from("holdings")
      .select("symbol")
      .eq("user_id", user.id)

    for (const h of holdings ?? []) {
      const protocol = SYMBOL_TO_PROTOCOL[h.symbol.toUpperCase()]
      if (!protocol) continue
      const set = userExposureByProtocol.get(protocol) ?? new Set<string>()
      set.add(h.symbol)
      userExposureByProtocol.set(protocol, set)
    }
  }

  // 4. CoinGecko (un seul appel batch)
  const cgIds = instruments.map((i) => i.coingecko_id!).filter(Boolean)
  let markets: CoinGeckoMarket[] = []
  try {
    markets = await fetchMarkets(cgIds, "usd")
  } catch {
    markets = []
  }
  const marketById = new Map(markets.map((m) => [m.id, m]))

  return instruments.map((inst) => {
    const meta = (inst.metadata ?? {}) as { protocol?: string }
    const protocol = meta.protocol ?? inst.coingecko_id ?? ""
    const dev = latestDev.get(inst.id)
    return {
      instrumentId: inst.id,
      symbol: inst.symbol,
      description: inst.description ?? inst.symbol,
      protocol,
      coingeckoId: inst.coingecko_id!,
      githubRepo: inst.github_repo!,
      market: marketById.get(inst.coingecko_id!) ?? null,
      dev: dev
        ? {
            observedOn: dev.observed_on,
            commits7d: dev.commits_7d,
            commits30d: dev.commits_30d,
            contributors30d: dev.contributors_30d,
            stars: dev.stars,
            lastReleaseTag: dev.last_release_tag,
            lastReleaseAt: dev.last_release_at,
          }
        : null,
      userExposureSymbols: Array.from(userExposureByProtocol.get(protocol) ?? []).sort(),
    }
  })
}
