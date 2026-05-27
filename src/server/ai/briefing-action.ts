"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { generateBriefingForUser } from "./briefing"

export type GenerateBriefingResult = {
  ok: boolean
  message?: string
}

/**
 * Server Action utilisateur : génère le briefing du jour pour l'utilisateur
 * courant si pas encore généré, ou force-regen.
 */
export async function generateMyBriefingAction(
  force = false,
): Promise<GenerateBriefingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Non authentifié." }

  try {
    const result = await generateBriefingForUser(user.id, { force })
    if (!result.generated && result.skipped_reason === "already_exists") {
      return { ok: true, message: "Déjà généré pour aujourd'hui." }
    }
    if (!result.generated) {
      return {
        ok: false,
        message: result.skipped_reason ?? "Briefing non généré.",
      }
    }
    revalidatePath("/dashboard")
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur inconnue",
    }
  }
}
