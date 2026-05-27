import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireEnv, optionalEnv } from "@/lib/env"
import { checkBudget } from "./budget"
import type { Database, Json } from "@/lib/types/database"

let cachedClient: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!cachedClient) {
    const apiKey = requireEnv("ANTHROPIC_API_KEY")
    cachedClient = new Anthropic({ apiKey })
  }
  return cachedClient
}

export function getModel(): string {
  return optionalEnv("ANTHROPIC_MODEL") ?? "claude-haiku-4-5"
}

/**
 * Tarification approximative pour calcul de coût (USD / 1M tokens).
 * Source : skill claude-api (oct 2026). Mise à jour à faire si le modèle change.
 */
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5":   { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6":  { in: 3.0, out: 15.0 },
  "claude-opus-4-7":    { in: 5.0, out: 25.0 },
  "claude-opus-4-6":    { in: 5.0, out: 25.0 },
}

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const base = model.replace(/-[0-9]{8}$/, "") // strip date suffix
  const p = PRICING[base] ?? PRICING["claude-haiku-4-5"]
  return ((tokensIn * p.in) + (tokensOut * p.out)) / 1_000_000
}

/**
 * Client Supabase service_role pour journaliser dans ai_runs (table user-scoped
 * mais l'écriture serveur passe par service_role pour ne pas dépendre de la
 * session courante — utile pour le cron briefing qui agit pour tous les users).
 */
let cachedService: ReturnType<typeof createServiceClient<Database>> | null = null
export function getServiceClient() {
  if (!cachedService) {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
    const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY") ?? optionalEnv("SUPABASE_SECRET_KEY")
    if (!key) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante pour journalisation ai_runs.")
    }
    cachedService = createServiceClient<Database>(url, key, {
      auth: { persistSession: false },
    })
  }
  return cachedService
}

export type AiMode = "briefing" | "analysis" | "alert" | "agent"

export type RunResult = {
  text: string
  tokensIn: number
  tokensOut: number
  cacheReadTokens: number
  cacheCreateTokens: number
  durationMs: number
  costUsd: number
  model: string
}

export type RunParams = {
  userId: string
  mode: AiMode
  /** System prompt — la partie stable. Sera marquée pour cache si > seuil. */
  system: string
  /** Messages utilisateur — partie variable (contexte du jour, question). */
  messages: Anthropic.MessageParam[]
  /** Max tokens — défaut 800 (briefing ~250 mots). */
  maxTokens?: number
  /** Métadonnées versionnées (slug du prompt, etc.) journalisées. */
  metadata?: { [key: string]: Json | undefined }
}

/**
 * Exécute un appel Claude :
 * - vérifie le budget tokens du jour
 * - active le prompt caching sur le system prompt
 * - journalise tout dans ai_runs (durée, tokens, coût)
 */
export async function runCompletion(params: RunParams): Promise<RunResult> {
  const supabase = getServiceClient()
  const budget = await checkBudget(supabase, params.userId)
  if (!budget.ok) {
    throw new Error(
      `Plafond IA quotidien atteint (${budget.used}/${budget.budget} tokens). Réessaie demain ou augmente le plafond dans Réglages.`,
    )
  }

  const model = getModel()
  const client = getAnthropic()
  const start = Date.now()

  let response: Anthropic.Message
  let errMsg: string | null = null
  try {
    response = await client.messages.create({
      model,
      max_tokens: params.maxTokens ?? 800,
      system: [
        {
          type: "text",
          text: params.system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: params.messages,
    })
  } catch (e) {
    errMsg = e instanceof Error ? e.message : "Erreur Anthropic inconnue"
    const duration = Date.now() - start
    await supabase.from("ai_runs").insert({
      user_id: params.userId,
      mode: params.mode,
      model,
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: 0,
      duration_ms: duration,
      status: "error",
      error: errMsg.slice(0, 500),
      metadata: params.metadata ?? {},
    })
    throw e
  }

  const tokensIn = response.usage.input_tokens
  const tokensOut = response.usage.output_tokens
  const cacheRead = response.usage.cache_read_input_tokens ?? 0
  const cacheCreate = response.usage.cache_creation_input_tokens ?? 0
  const durationMs = Date.now() - start
  const costUsd = estimateCost(model, tokensIn + cacheCreate + cacheRead, tokensOut)

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()

  await supabase.from("ai_runs").insert({
    user_id: params.userId,
    mode: params.mode,
    model,
    tokens_in: tokensIn + cacheCreate + cacheRead,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    duration_ms: durationMs,
    status: response.stop_reason === "refusal" ? "truncated" : "ok",
    metadata: {
      ...(params.metadata ?? {}),
      cache_read_tokens: cacheRead,
      cache_create_tokens: cacheCreate,
      stop_reason: response.stop_reason,
    },
  })

  return {
    text,
    tokensIn,
    tokensOut,
    cacheReadTokens: cacheRead,
    cacheCreateTokens: cacheCreate,
    durationMs,
    costUsd,
    model,
  }
}
