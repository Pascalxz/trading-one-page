"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  toggleAlertAction,
  deleteAlertAction,
  seedDefaultAlertsAction,
} from "@/server/alerts/actions"
import type { AlertRow } from "@/server/alerts/queries"

export function AlertList({ alerts }: { alerts: AlertRow[] }) {
  const t = useTranslations("settings")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const localeStr = locale === "fr" ? "fr-CA" : "en-CA"
  const [pending, startTransition] = useTransition()

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface/40 p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">{t("alertsEmpty")}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await seedDefaultAlertsAction()
            })
          }
          className="rounded-md border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm text-accent hover:bg-accent/20 transition disabled:opacity-60"
        >
          {pending ? "…" : t("createDefaults")}
        </button>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li
          key={a.id}
          className="rounded-lg border border-border bg-surface/40 p-4 flex items-start justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                {a.kind === "pct_change" ? t("alertKindVariation") : t("alertKindCatalyst")}
              </span>
              {!a.is_active && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {t("inactive")}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground">{a.label ?? formatDescription(a, t)}</p>
            <p className="mt-1 text-[11px] text-muted">
              {a.trigger_count > 0
                ? t("triggered", {
                    count: a.trigger_count,
                    last: a.last_triggered_at
                      ? new Date(a.last_triggered_at).toLocaleString(localeStr, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—",
                  })
                : t("neverTriggered")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await toggleAlertAction(a.id, !a.is_active)
                })
              }
              className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {a.is_active ? t("deactivate") : t("activate")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(t("confirmDelete"))) return
                startTransition(async () => {
                  await deleteAlertAction(a.id)
                })
              }}
              className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-loss transition-colors disabled:opacity-50"
            >
              {tCommon("delete")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatDescription(a: AlertRow, t: (k: string) => string): string {
  if (a.kind === "pct_change") {
    const tr = (a.config as { threshold_pct?: number }).threshold_pct ?? 0
    const scope = (a.config as { scope?: string; symbol?: string }).scope
    const sym = (a.config as { symbol?: string }).symbol
    if (scope === "symbol" && sym) {
      return `${sym} : ±${tr} %`
    }
    return `${t("scopeAny")} : ±${tr} %`
  }
  if (a.kind === "event_proximity") {
    const d = (a.config as { days_until?: number }).days_until ?? 0
    const kinds = (a.config as { kinds?: string[] }).kinds
    const kindLabel = kinds?.length ? kinds.join(" / ") : "*"
    return `${kindLabel} · ≤ ${d}j`
  }
  return a.kind
}
