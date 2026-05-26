"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function assignThemeAction(holdingId: string, themeId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("holdings")
    .update({ theme_id: themeId })
    .eq("id", holdingId)

  if (error) {
    return { ok: false as const, error: error.message }
  }
  revalidatePath("/portefeuille")
  revalidatePath("/dashboard")
  return { ok: true as const }
}
