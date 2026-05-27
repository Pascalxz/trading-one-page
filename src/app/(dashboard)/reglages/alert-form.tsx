"use client"

import { useActionState, useState } from "react"
import { createAlertAction, type CreateAlertResult } from "@/server/alerts/actions"

const initial: CreateAlertResult = { ok: false }

export function AlertForm() {
  const [state, formAction, pending] = useActionState(createAlertAction, initial)
  const [kind, setKind] = useState<"pct_change" | "event_proximity">("pct_change")
  const [scope, setScope] = useState<"any" | "symbol">("any")

  return (
    <form
      action={formAction}
      className="rounded-lg border border-border bg-surface/40 p-5 space-y-4"
    >
      <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
        Nouvelle alerte
      </h3>

      <Field label="Type">
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="pct_change">Variation % d&apos;une position</option>
          <option value="event_proximity">Proximité d&apos;un catalyseur (FOMC / CPI)</option>
        </select>
      </Field>

      <Field label="Libellé (optionnel)">
        <input
          name="label"
          type="text"
          placeholder={
            kind === "pct_change"
              ? "ex : Variation forte sur ETHX.B"
              : "ex : FOMC à 3 jours"
          }
          className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </Field>

      {kind === "pct_change" && (
        <>
          <Field label="Scope">
            <select
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="any">Toutes les positions</option>
              <option value="symbol">Un symbole précis</option>
            </select>
          </Field>
          {scope === "symbol" && (
            <Field label="Symbole">
              <input
                name="symbol"
                type="text"
                required
                placeholder="ex : ETHX.B"
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-mono uppercase"
              />
            </Field>
          )}
          <Field label="Seuil de variation (%)" hint="Valeur absolue, déclenche dans les deux sens.">
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
          <Field label="Fenêtre (jours)" hint="Déclenche quand un catalyseur est dans cette fenêtre.">
            <input
              name="days_until"
              type="number"
              min="0"
              defaultValue="3"
              required
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </Field>
          <Field
            label="Types (CSV — laisse vide pour tous)"
            hint="ex : fomc — ou fomc,cpi_release"
          >
            <input
              name="kinds_csv"
              type="text"
              placeholder="fomc, cpi_release"
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
        {pending ? "Création…" : "Créer l'alerte"}
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
