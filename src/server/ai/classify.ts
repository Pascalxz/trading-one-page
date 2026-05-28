import "server-only"

import type Anthropic from "@anthropic-ai/sdk"
import { getAnthropic, getModel, getServiceClient } from "@/lib/ai/client"
import { CLASSIFY_SYSTEM, CLASSIFY_PROMPT_VERSION } from "@/lib/ai/prompts/classify"
import { checkBudget } from "@/lib/ai/budget"
import { estimateCost } from "@/lib/ai/client"
import type { ThemeSlug } from "@/lib/portfolio/classifier"

export type UnknownSymbol = { symbol: string; description?: string | null }

export type Classification = {
  symbol: string
  theme_slug: ThemeSlug | "other"
  confidence: "high" | "medium" | "low"
  reason: string
}

export type ClassifyResult = {
  classifications: Classification[]
  tokens_in: number
  tokens_out: number
  cost_usd: number
  model: string
}

const VALID_SLUGS: ReadonlySet<string> = new Set([
  "mining-crypto",
  "ai",
  "crypto-etf",
  "crypto-l1",
  "value-bluechip",
  "speculative",
  "biotech",
  "space",
  "cash",
  "other",
])

/**
 * Classifie une liste de tickers inconnus via Claude. Idempotent côté IA :
 * la classification est purement déterminée par le ticker + sa description.
 * Plafonne à 20 symboles par appel pour borner le coût.
 */
export async function classifyUnknownSymbols(
  userId: string,
  symbols: UnknownSymbol[],
): Promise<ClassifyResult> {
  if (symbols.length === 0) {
    return { classifications: [], tokens_in: 0, tokens_out: 0, cost_usd: 0, model: getModel() }
  }
  const batch = symbols.slice(0, 20)
  const supabase = getServiceClient()
  const budget = await checkBudget(supabase, userId)
  if (!budget.ok) {
    throw new Error(
      `Plafond IA quotidien atteint (${budget.used}/${budget.budget}). ` +
        `Auto-classification IA suspendue pour aujourd'hui.`,
    )
  }

  const userMessage =
    `Classifie ces tickers dans un de nos thèmes. Réponds en JSON strict :\n\n` +
    "```json\n" +
    JSON.stringify(
      batch.map((s) => ({ symbol: s.symbol, description: s.description ?? null })),
      null,
      2,
    ) +
    "\n```"

  const client = getAnthropic()
  const model = getModel()
  const start = Date.now()

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: CLASSIFY_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  // Parse JSON robustement (Claude peut entourer de markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let parsed: { classifications?: Classification[] } = {}
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      parsed = {}
    }
  }

  const classifications: Classification[] = (parsed.classifications ?? []).flatMap(
    (c) => {
      if (!c || !c.symbol || !c.theme_slug) return []
      const slug = VALID_SLUGS.has(c.theme_slug) ? (c.theme_slug as ThemeSlug | "other") : "other"
      return [
        {
          symbol: String(c.symbol).toUpperCase(),
          theme_slug: slug,
          confidence: ["high", "medium", "low"].includes(c.confidence) ? c.confidence : "low",
          reason: String(c.reason ?? "").slice(0, 200),
        },
      ]
    },
  )

  const tokensIn = response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) +
    (response.usage.cache_creation_input_tokens ?? 0)
  const tokensOut = response.usage.output_tokens
  const costUsd = estimateCost(model, tokensIn, tokensOut)

  await supabase.from("ai_runs").insert({
    user_id: userId,
    mode: "agent",
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    duration_ms: Date.now() - start,
    status: "ok",
    metadata: {
      prompt_version: CLASSIFY_PROMPT_VERSION,
      batch_size: batch.length,
      classified: classifications.length,
    },
  })

  return { classifications, tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: costUsd, model }
}
