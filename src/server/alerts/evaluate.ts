import "server-only"

import { getServiceClient, runCompletion } from "@/lib/ai/client"
import { buildSnapshot } from "@/lib/ai/context"
import { ALERT_ENRICH_SYSTEM, ALERT_PROMPT_VERSION } from "@/lib/ai/prompts/alerts"
import {
  evaluatePctChange,
  evaluateEventProximity,
  type HoldingSnapshot,
  type MacroEventSnapshot,
  type TriggerCandidate,
} from "@/lib/alerts/evaluator"
import type { Database, Json } from "@/lib/types/database"

export type AlertScanResult = {
  ok: boolean
  evaluated: number
  triggered: number
  skipped_dedup: number
  errors: string[]
}

/**
 * Cron : pour chaque alerte active de chaque user, lance les règles, dédupe
 * via alert_events, et enrichit avec Claude les nouveaux déclenchements.
 */
export async function scanAllAlerts(): Promise<AlertScanResult> {
  const supabase = getServiceClient()
  let evaluated = 0
  let triggered = 0
  let skippedDedup = 0
  const errors: string[] = []

  // 1. Récupère les utilisateurs distincts qui ont des alertes actives
  const { data: alertRows, error } = await supabase
    .from("alerts")
    .select("id, user_id, kind, label, symbol, config")
    .eq("is_active", true)

  if (error || !alertRows) {
    return { ok: false, evaluated: 0, triggered: 0, skipped_dedup: 0, errors: [error?.message ?? "no alerts"] }
  }
  if (alertRows.length === 0) {
    return { ok: true, evaluated: 0, triggered: 0, skipped_dedup: 0, errors: [] }
  }

  // 2. Group par user
  const byUser = new Map<string, typeof alertRows>()
  for (const a of alertRows) {
    const list = byUser.get(a.user_id) ?? []
    list.push(a)
    byUser.set(a.user_id, list)
  }

  // 3. Pour chaque user : charge holdings + macro_events, évalue les règles
  for (const [userId, userAlerts] of byUser.entries()) {
    try {
      const today = new Date().toISOString().slice(0, 10)

      const [{ data: holdings }, { data: events }] = await Promise.all([
        supabase
          .from("holdings")
          .select(
            "symbol, day_change_pct, market_value, unrealized_pnl, unrealized_pnl_pct, currency",
          )
          .eq("user_id", userId),
        supabase
          .from("macro_events")
          .select("id, kind, title, scheduled_at")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(20),
      ])

      const holdingSnaps: HoldingSnapshot[] = (holdings ?? []).map((h) => ({
        symbol: h.symbol,
        day_change_pct: numOrNull(h.day_change_pct),
        market_value: numOrNull(h.market_value),
        unrealized_pnl: numOrNull(h.unrealized_pnl),
        unrealized_pnl_pct: numOrNull(h.unrealized_pnl_pct),
        currency: h.currency ?? "CAD",
        theme_name: null,
      }))
      const eventSnaps: MacroEventSnapshot[] = (events ?? []).map((e) => ({
        id: e.id,
        kind: e.kind,
        title: e.title,
        scheduled_at: e.scheduled_at,
      }))

      for (const alert of userAlerts) {
        evaluated += 1
        const config = (alert.config ?? {}) as Record<string, unknown>
        let candidates: TriggerCandidate[] = []

        try {
          if (alert.kind === "pct_change") {
            candidates = evaluatePctChange(
              config as { threshold_pct: number; scope?: "any" | "symbol"; symbol?: string },
              holdingSnaps,
              today,
            )
          } else if (alert.kind === "event_proximity") {
            candidates = evaluateEventProximity(
              config as { days_until: number; kinds?: string[] },
              eventSnaps,
            )
          } else {
            // Kinds non implémentés en V1 : on saute silencieusement
            continue
          }
        } catch (e) {
          errors.push(`alert ${alert.id}: ${e instanceof Error ? e.message : "eval error"}`)
          continue
        }

        for (const candidate of candidates) {
          // Dedup : on cherche un alert_event existant avec le même dedup_key dans context
          const { data: existing } = await supabase
            .from("alert_events")
            .select("id")
            .eq("alert_id", alert.id)
            .eq("user_id", userId)
            .contains("context", { dedup_key: candidate.dedup_key })
            .limit(1)
          if (existing && existing.length > 0) {
            skippedDedup += 1
            continue
          }

          // Enrichissement IA (best-effort — on continue même si erreur)
          let enrichedMessage = candidate.reason
          try {
            const snapshot = await buildSnapshot(supabase, userId)
            const userMessage =
              `Alerte déclenchée :\n${candidate.reason}\n\n` +
              `Snapshot complet (JSON) — utilise-le pour rédiger 2 à 4 phrases ` +
              `de contexte :\n\n` +
              "```json\n" +
              JSON.stringify(snapshot, null, 2) +
              "\n```"
            const result = await runCompletion({
              userId,
              mode: "alert",
              system: ALERT_ENRICH_SYSTEM,
              messages: [{ role: "user", content: userMessage }],
              maxTokens: 300,
              metadata: {
                prompt_version: ALERT_PROMPT_VERSION,
                alert_id: alert.id,
                dedup_key: candidate.dedup_key,
              },
            })
            if (result.text.trim()) enrichedMessage = result.text.trim()
          } catch (e) {
            errors.push(
              `enrich ${alert.id}/${candidate.dedup_key}: ${e instanceof Error ? e.message : "ai error"}`,
            )
          }

          const context: Json = {
            dedup_key: candidate.dedup_key,
            reason: candidate.reason,
            triggered_value: candidate.triggered_value,
            symbol: candidate.symbol ?? null,
            related_holdings: candidate.related_holdings ?? null,
            related_event: candidate.related_event
              ? {
                  id: candidate.related_event.id,
                  kind: candidate.related_event.kind,
                  title: candidate.related_event.title,
                  scheduled_at: candidate.related_event.scheduled_at,
                }
              : null,
            alert_kind: alert.kind,
            alert_label: alert.label,
          }

          const { error: insErr } = await supabase.from("alert_events").insert({
            alert_id: alert.id,
            user_id: userId,
            context,
            message: enrichedMessage,
            is_read: false,
          })
          if (insErr) {
            errors.push(`insert ${alert.id}: ${insErr.message}`)
          } else {
            triggered += 1
          }
        }
      }
    } catch (e) {
      errors.push(`user ${userId.slice(0, 8)}: ${e instanceof Error ? e.message : "error"}`)
    }
  }

  return {
    ok: errors.length === 0,
    evaluated,
    triggered,
    skipped_dedup: skippedDedup,
    errors,
  }
}

function numOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined) return null
  return typeof v === "number" ? v : Number(v)
}
