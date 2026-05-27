"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { classifySymbol } from "@/lib/portfolio/classifier"
import { classifyUnknownSymbols } from "@/server/ai/classify"
import { optionalEnv } from "@/lib/env"

export type AutoClassifyResult = {
  ok: boolean
  classified_rule: number     // par mapping déterministe
  classified_ai: number       // par fallback IA
  unknown: number             // toujours sans thème après l'IA
  ai_used: boolean
  ai_cost_usd?: number
  ai_error?: string
  error?: string
  /** Compat ancien shape : total classifié (rule + ai). */
  classified: number
}

/**
 * Classifie automatiquement les positions sans thème de l'utilisateur courant.
 * Pipeline :
 *  1. Mapping explicite + heuristiques déterministes (instantané, gratuit)
 *  2. Pour les inconnus restants, fallback Claude (mode 4, opt-in via env)
 *  3. Ce qui reste : laisse theme_id = null (l'utilisateur garde la main)
 *
 * Le fallback IA est activé si ANTHROPIC_API_KEY est configurée. Sinon, le
 * comportement reste identique à V1.0.
 */
export async function autoClassifyAction(): Promise<AutoClassifyResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return emptyError("Non authentifié.")
  }

  // 1. Récupère les thèmes de l'utilisateur (id + slug)
  const { data: themes, error: themesErr } = await supabase
    .from("themes")
    .select("id, slug")
    .eq("user_id", user.id)

  if (themesErr || !themes) {
    return emptyError(themesErr?.message ?? "Thèmes introuvables.")
  }
  const themeIdBySlug = new Map(themes.map((t) => [t.slug, t.id]))

  // 2. Récupère les holdings sans thème
  const { data: holdings, error: holdErr } = await supabase
    .from("holdings")
    .select("id, symbol, description")
    .eq("user_id", user.id)
    .is("theme_id", null)

  if (holdErr) {
    return emptyError(holdErr.message)
  }
  if (!holdings || holdings.length === 0) {
    return {
      ok: true,
      classified_rule: 0,
      classified_ai: 0,
      unknown: 0,
      ai_used: false,
      classified: 0,
    }
  }

  // 3. Pass déterministe
  const ruleAssignments = new Map<string, string>() // holdingId → themeId
  const unknownHoldings: { id: string; symbol: string; description: string | null }[] = []

  for (const h of holdings) {
    const slug = classifySymbol(h.symbol, h.description)
    const themeId = slug ? themeIdBySlug.get(slug) : undefined
    if (themeId) {
      ruleAssignments.set(h.id, themeId)
    } else {
      unknownHoldings.push(h)
    }
  }

  // 4. Pass IA (optionnel) sur les inconnus
  const aiAssignments = new Map<string, string>() // holdingId → themeId
  let aiUsed = false
  let aiCost: number | undefined
  let aiError: string | undefined

  if (unknownHoldings.length > 0 && optionalEnv("ANTHROPIC_API_KEY")) {
    aiUsed = true
    try {
      // Dédupe les symboles (plusieurs comptes peuvent détenir le même)
      const uniq = new Map<string, { id: string; symbol: string; description: string | null }>()
      for (const h of unknownHoldings) {
        const key = h.symbol.toUpperCase()
        if (!uniq.has(key)) uniq.set(key, h)
      }
      const symbols = Array.from(uniq.values()).map((h) => ({
        symbol: h.symbol,
        description: h.description ?? null,
      }))

      const result = await classifyUnknownSymbols(user.id, symbols)
      aiCost = result.cost_usd

      const themeBySymbol = new Map<string, string>() // symbol upper → themeId
      for (const c of result.classifications) {
        const themeId = themeIdBySlug.get(c.theme_slug)
        // On ne stocke pas les classifications "low" ni "other" pour rester prudent
        if (themeId && c.theme_slug !== "other" && c.confidence !== "low") {
          themeBySymbol.set(c.symbol.toUpperCase(), themeId)
        }
      }

      for (const h of unknownHoldings) {
        const themeId = themeBySymbol.get(h.symbol.toUpperCase())
        if (themeId) aiAssignments.set(h.id, themeId)
      }
    } catch (e) {
      aiError = e instanceof Error ? e.message : "Erreur IA"
    }
  }

  // 5. Update DB en batch par thème
  const byTheme = new Map<string, string[]>()
  for (const [hid, tid] of ruleAssignments.entries()) {
    const list = byTheme.get(tid) ?? []
    list.push(hid)
    byTheme.set(tid, list)
  }
  for (const [hid, tid] of aiAssignments.entries()) {
    const list = byTheme.get(tid) ?? []
    list.push(hid)
    byTheme.set(tid, list)
  }

  for (const [themeId, ids] of byTheme.entries()) {
    const { error } = await supabase
      .from("holdings")
      .update({ theme_id: themeId })
      .in("id", ids)
    if (error) {
      return emptyError(error.message)
    }
  }

  const classifiedRule = ruleAssignments.size
  const classifiedAi = aiAssignments.size
  const unknown = unknownHoldings.length - classifiedAi

  revalidatePath("/portefeuille")
  revalidatePath("/dashboard")

  return {
    ok: true,
    classified_rule: classifiedRule,
    classified_ai: classifiedAi,
    unknown,
    ai_used: aiUsed,
    ai_cost_usd: aiCost,
    ai_error: aiError,
    classified: classifiedRule + classifiedAi,
  }
}

function emptyError(msg: string): AutoClassifyResult {
  return {
    ok: false,
    classified_rule: 0,
    classified_ai: 0,
    unknown: 0,
    ai_used: false,
    error: msg,
    classified: 0,
  }
}
