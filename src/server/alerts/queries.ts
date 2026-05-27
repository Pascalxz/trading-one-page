import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"

type AlertKind = Database["public"]["Enums"]["alert_kind"]

export type AlertRow = {
  id: string
  kind: AlertKind
  label: string | null
  symbol: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  last_triggered_at: string | null
  trigger_count: number
}

export type AlertEventRow = {
  id: string
  alert_id: string
  alert_label: string | null
  alert_kind: AlertKind | null
  triggered_at: string
  message: string | null
  is_read: boolean
  context: Record<string, unknown>
}

export async function fetchAlerts(): Promise<AlertRow[]> {
  const supabase = await createClient()
  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, kind, label, symbol, config, is_active, created_at")
    .order("created_at", { ascending: false })

  if (!alerts) return []

  // Stats par alerte
  const ids = alerts.map((a) => a.id)
  if (ids.length === 0) return []
  const { data: events } = await supabase
    .from("alert_events")
    .select("alert_id, triggered_at")
    .in("alert_id", ids)
    .order("triggered_at", { ascending: false })

  const stats = new Map<string, { last: string; count: number }>()
  for (const e of events ?? []) {
    const cur = stats.get(e.alert_id) ?? { last: e.triggered_at, count: 0 }
    cur.count += 1
    if (e.triggered_at > cur.last) cur.last = e.triggered_at
    stats.set(e.alert_id, cur)
  }

  return alerts.map((a) => ({
    id: a.id,
    kind: a.kind,
    label: a.label,
    symbol: a.symbol,
    config: (a.config ?? {}) as Record<string, unknown>,
    is_active: a.is_active,
    created_at: a.created_at,
    last_triggered_at: stats.get(a.id)?.last ?? null,
    trigger_count: stats.get(a.id)?.count ?? 0,
  }))
}

export async function fetchRecentAlertEvents(limit = 20): Promise<AlertEventRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("alert_events")
    .select("id, alert_id, triggered_at, message, is_read, context")
    .order("triggered_at", { ascending: false })
    .limit(limit)

  if (!data) return []
  return data.map((e) => {
    const ctx = (e.context ?? {}) as Record<string, unknown>
    return {
      id: e.id,
      alert_id: e.alert_id,
      alert_label: (ctx.alert_label as string) ?? null,
      alert_kind: (ctx.alert_kind as AlertKind) ?? null,
      triggered_at: e.triggered_at,
      message: e.message,
      is_read: e.is_read,
      context: ctx,
    }
  })
}
