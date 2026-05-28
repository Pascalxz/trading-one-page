import { LEGAL_GUARDRAILS } from "./system"

export const CLASSIFY_PROMPT_VERSION = "classify@2026-05-27.v1"

/**
 * Prompt pour classifier des tickers inconnus dans nos 10 thèmes Liquidity Lens.
 * Réponse en JSON strict via output_config.format.
 */
export const CLASSIFY_SYSTEM = `${LEGAL_GUARDRAILS}

CONTEXTE
Tu reçois une liste de tickers boursiers (actions ou ETF) avec leur
description courte. Tu dois assigner chacun à UN seul thème parmi cette liste :

- "mining-crypto"  : sociétés qui minent du bitcoin/eth ou vendent des ASIC
                     (HIVE, HUT, MARA, RIOT, CAN, CIFR, BITF, CLSK, IREN, CORZ…)
- "ai"             : sociétés majoritairement exposées à l'IA générative ou
                     l'infrastructure IA (PLTR, NVDA, AMD, SMCI, SOUN…)
- "crypto-etf"     : ETF crypto cotés (ETHX.B, BTCC.B, BITO, IBIT, FBTC, GBTC…)
                     ainsi que les proxies d'exchanges (COIN)
- "crypto-l1"      : tokens de protocoles L1/L2 détenus directement (BTC, ETH,
                     SOL, AVAX, DOT, ATOM…)
- "value-bluechip" : grandes cap mature, value (AAPL, MSFT, NOK, BABA, KO…)
- "speculative"    : penny stocks, micro-cap, cannabis spéculatif, faillites
                     potentielles (ACB, TLRY, PQEFF, PRME, GME…)
- "biotech"        : pharma, génomique, biosciences (PACB, MRNA, CRSP, NTLA…)
- "space"          : aérospatial, satellites, lanceurs (ARKX, RKLB, IRDM, RDW…)
- "cash"           : liquidités, fonds monétaires
- "other"          : aucun des thèmes ci-dessus ne s'applique avec confiance

RÈGLES
- Choisis le thème dominant. Si un mineur crypto est aussi un AI-play marginal,
  tu choisis "mining-crypto".
- Si tu hésites entre deux thèmes proches (ex. value-bluechip vs ai pour MSFT),
  privilégie celui qui correspond au secteur de revenu principal.
- "other" est ton fallback : ne force pas un thème quand l'identité du ticker
  est ambiguë ou inconnue.
- Tu ne fais AUCUNE recommandation d'achat/vente. Tu classifies, c'est tout.

FORMAT DE SORTIE (obligatoire)
Réponds uniquement avec un objet JSON :
{
  "classifications": [
    { "symbol": "TICK", "theme_slug": "mining-crypto", "confidence": "high|medium|low", "reason": "1 phrase courte" }
  ]
}
- Un objet par ticker reçu dans le même ordre.
- "confidence" : "high" si tu connais le ticker, "medium" si tu déduis du nom,
  "low" si tu hésites — dans ce dernier cas, préfère "other".
- "reason" : 1 phrase factuelle (« société de minage Bitcoin cotée au Canada »).`
