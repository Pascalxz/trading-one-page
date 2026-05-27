"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { createAlertAction, type CreateAlertResult } from "@/server/alerts/actions"

const initial: CreateAlertResult = { ok: false }

export function AlertForm() {
  const t = useTranslations("settings")
  const [state, formAction, pending] = useActionState(createAlertAction, initial)
  const [kind, setKind] = useState<"pct_change" | "event_proximity">("pct_change")
  const [scope, setScope] = useState<"any" | "symbol">("any")

  return (
    <form
      action={formAction}
      className="rounded-lg border border-border bg-surface/40 p-5 space-y-4"
    >
      <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
        {t("newAlert")}
      </h3>

      <Field label={t("type")}>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="pct_change">{t("pctChangeLabel")}</option>
          <option value="event_proximity">{t("eventProximityLabel")}</option>
        </select>
      </Field>

      <Field label={t("label")}>
        <input
          name="label"
          type="text"
          className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </Field>

      {kind === "pct_change" && (
        <>
          <Field label={t("scope")}>
            <select
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="any">{t("scopeAny")}</option>
              <option value="symbol">{t("scopeSymbol")}</option>
            </select>
          </Field>
          {scope === "symbol" && (
            <Field label={t("symbol")}>
              <input
                name="symbol"
                type="text"
                required
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-mono uppercase"
              />
            </Field>
          )}
          <Field label={t("thresholdPct")} hint={t("thresholdHint")}>
            <input
              name="threshold_pct"
              type="number"
              step="0.1"
              min="0.1"
              defaultValue="5"
              required
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </Field>
        </>
      )}

      {kind === "event_proximity" && (
        <>
          <Field label={t("window")} hint={t("windowHint")}>
            <input
              name="days_until"
              type="number"
              min="0"
              defaultValue="3"
              required
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("kindsCsv")} hint={t("kindsCsvHint")}>
            <input
              name="kinds_csv"
              type="text"
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-mono"
            />
          </Field>
        </>
      )}

      {!state.ok && state.error && (
        <p className="text-sm text-loss border border-loss/30 bg-loss/10 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#1a1206] hover:brightness-110 transition disabled:opacity-60"
      >
        {pending ? t("creating") : t("createAlert")}
      </button>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.18em] text-muted mb-1.5 font-mono">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  )
}
