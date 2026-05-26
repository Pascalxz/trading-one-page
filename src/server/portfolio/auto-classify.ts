"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { classifySymbol } from "@/lib/portfolio/classifier"

export type AutoClassifyResult = {
  ok: boolean
  classified: number
  unknown: number
  error?: string
}

/**
 * Classifie automatiquement les positions sans thème de l'utilisateur courant.
 * - Respecte les positions déjà thématisées (n'écrase pas un choix manuel)
 * - Pour les inconnus : laisse theme_id = null (l'utilisateur garde la main)
 */
export async function autoClassifyAction(): Promise<AutoClassifyResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, classified: 0, unknown: 0, error: "Non authentifié." }

  // 1. Récupère les thèmes de l'utilisateur (id + slug)
  const { data: themes, error: themesErr } = await supabase
    .from("themes")
    .select("id, slug")
    .eq("user_id", user.id)

  if (themesErr || !themes) {
    return {
      ok: false,
      classified: 0,
      unknown: 0,
      error: themesErr?.message ?? "Thèmes introuvables.",
    }
  }
  const themeIdBySlug = new Map(themes.map((t) => [t.slug, t.id]))

  // 2. Récupère les holdings sans thème
  const { data: holdings, error: holdErr } = await supabase
    .from("holdings")
    .select("id, symbol, description")
    .eq("user_id", user.id)
    .is("theme_id", null)

  if (holdErr) {
    return { ok: false, classified: 0, unknown: 0, error: holdErr.message }
  }
  if (!holdings || holdings.length === 0) {
    return { ok: true, classified: 0, unknown: 0 }
  }

  // 3. Classifier en mémoire puis update par batch (un update par theme_id)
  const byTheme = new Map<string, string[]>() // themeId → holdingIds
  let unknown = 0

  for (const h of holdings) {
    const slug = classifySymbol(h.symbol, h.description)
    if (!slug) {
      unknown += 1
      continue
    }
    const themeId = themeIdBySlug.get(slug)
    if (!themeId) {
      unknown += 1
      continue
    }
    const list = byTheme.get(themeId) ?? []
    list.push(h.id)
    byTheme.set(themeId, list)
  }

  let classified = 0
  for (const [themeId, ids] of byTheme.entries()) {
    const { error } = await supabase
      .from("holdings")
      .update({ theme_id: themeId })
      .in("id", ids)
    if (error) {
      return { ok: false, classified, unknown, error: error.message }
    }
    classified += ids.length
  }

  revalidatePath("/portefeuille")
  revalidatePath("/dashboard")
  return { ok: true, classified, unknown }
}
