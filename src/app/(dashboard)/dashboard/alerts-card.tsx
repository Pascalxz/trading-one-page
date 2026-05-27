"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { markAlertEventReadAction } from "@/server/alerts/actions"
import type { AlertEventRow } from "@/server/alerts/queries"

export function AlertsCard({ events }: { events: AlertEventRow[] }) {
  const [items, setItems] = useState(events)
  const [pending, startTransition] = useTransition()

  const unread = items.filter((e) => !e.is_read)
  if (unread.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface/40 p-5">
        <header className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
            Alertes
          </p>
          <Link
            href="/reglages"
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-strong hover:text-accent transition-colors"
          >
            Gérer
          </Link>
        </header>
        <p className="text-sm text-muted">
          Aucune alerte non lue. Le cron passe toutes les 4 h.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-loss/30 bg-loss/5 p-5">
      <header className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-[0.22em] text-loss">
          {unread.length} alerte{unread.length > 1 ? "s" : ""} non lue
          {unread.length > 1 ? "s" : ""}
        </p>
        <Link
          href="/reglages"
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-strong hover:text-accent transition-colors"
        >
          Gérer
        </Link>
      </header>
      <ul className="space-y-3">
        {unread.slice(0, 5).map((e) => (
          <li
            key={e.id}
            className="rounded-md border border-border bg-surface/60 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted mb-1">
                  {e.alert_kind === "pct_change" ? "Variation" : "Catalyseur"}{" "}
                  · {new Date(e.triggered_at).toLocaleString("fr-CA", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {e.message ?? "Alerte déclenchée."}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await markAlertEventReadAction(e.id)
                    if (r.ok) {
                      setItems((cur) =>
                        cur.map((it) =>
                          it.id === e.id ? { ...it, is_read: true } : it,
                        ),
                      )
                    }
                  })
                }
                className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-foreground transition-colors disabled:opacity-50 shrink-0"
              >
                Lu
              </button>
            </div>
          </li>
        ))}
      </ul>
      {unread.length > 5 && (
        <p className="mt-3 text-[11px] text-muted">
          + {unread.length - 5} autre{unread.length - 5 > 1 ? "s" : ""} dans
          Réglages.
        </p>
      )}
    </section>
  )
}
