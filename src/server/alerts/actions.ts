"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"

type AlertKind = Database["public"]["Enums"]["alert_kind"]

export type CreateAlertResult = { ok: boolean; error?: string }

/**
 * Crée une alerte à partir d'un FormData simple (formulaire HTML).
 * Champs : kind, label, threshold_pct (ou days_until), scope, symbol, kinds_csv.
 */
export async function createAlertAction(
  _prev: CreateAlertResult,
  formData: FormData,
): Promise<CreateAlertResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Non authentifié." }

  const kind = String(formData.get("kind") ?? "") as AlertKind
  const label = String(formData.get("label") ?? "").trim() || null

  let config: Record<string, unknown> = {}
  let symbol: string | null = null

  if (kind === "pct_change") {
    const threshold = Number(formData.get("threshold_pct"))
    if (!Number.isFinite(threshold) || threshold <= 0) {
      return { ok: false, error: "Seuil de variation invalide." }
    }
    const scope = String(formData.get("scope") ?? "any")
    const sym = String(formData.get("symbol") ?? "").trim().toUpperCase()
    config = { threshold_pct: threshold, scope }
    if (scope === "symbol") {
      if (!sym) return { ok: false, error: "Symbole requis pour ce scope." }
      config.symbol = sym
      symbol = sym
    }
  } else if (kind === "event_proximity") {
    const days = Number(formData.get("days_until"))
    if (!Number.isFinite(days) || days < 0) {
      return { ok: false, error: "Fenêtre invalide." }
    }
    config = { days_until: Math.floor(days) }
    const kindsCsv = String(formData.get("kinds_csv") ?? "").trim()
    if (kindsCsv) {
      config.kinds = kindsCsv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    }
  } else {
    return { ok: false, error: `Type d'alerte non supporté en V1 : ${kind}.` }
  }

  const { error } = await supabase.from("alerts").insert({
    user_id: user.id,
    kind,
    label,
    symbol,
    config: config as never,
    is_active: true,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/reglages")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function toggleAlertAction(alertId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("alerts")
    .update({ is_active: isActive })
    .eq("id", alertId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/reglages")
  revalidatePath("/dashboard")
  return { ok: true as const }
}

export async function deleteAlertAction(alertId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("alerts").delete().eq("id", alertId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/reglages")
  revalidatePath("/dashboard")
  return { ok: true as const }
}

export async function markAlertEventReadAction(eventId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("alert_events")
    .update({ is_read: true })
    .eq("id", eventId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/dashboard")
  revalidatePath("/reglages")
  return { ok: true as const }
}

/**
 * Crée un jeu d'alertes par défaut (3 règles courantes — PRD §4.4 exemples).
 */
export async function seedDefaultAlertsAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Non authentifié." }

  const defaults = [
    {
      user_id: user.id,
      kind: "pct_change" as const,
      label: "Position qui bouge de ±5 % sur la journée",
      symbol: null,
      config: { threshold_pct: 5, scope: "any" } as never,
      is_active: true,
    },
    {
      user_id: user.id,
      kind: "event_proximity" as const,
      label: "FOMC dans ≤ 3 jours",
      symbol: null,
      config: { days_until: 3, kinds: ["fomc"] } as never,
      is_active: true,
    },
    {
      user_id: user.id,
      kind: "event_proximity" as const,
      label: "CPI demain",
      symbol: null,
      config: { days_until: 1, kinds: ["cpi_release"] } as never,
      is_active: true,
    },
  ]

  const { error, data } = await supabase.from("alerts").insert(defaults).select("id")
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/reglages")
  return { ok: true as const, count: data?.length ?? 0 }
}
