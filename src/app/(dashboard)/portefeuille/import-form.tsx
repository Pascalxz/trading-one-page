"use client"

import { useActionState, useRef } from "react"
import { useTranslations } from "next-intl"
import { importQuestradeCsvAction } from "@/server/portfolio/import"
import { importInitialState, type ImportState } from "@/server/portfolio/import-types"

export function ImportForm() {
  const t = useTranslations("portfolio")
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importQuestradeCsvAction,
    importInitialState,
  )
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form
      action={formAction}
      className="rounded-lg border border-dashed border-border-strong bg-surface/40 p-5"
    >
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted mb-3">
        {t("importTitle")}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-foreground file:cursor-pointer file:hover:bg-border-strong file:transition-colors"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-[#1a1206] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed self-start"
        >
          {pending ? t("importing") : t("importCta")}
        </button>
      </div>

      {state.status === "error" && (
        <p className="mt-3 text-sm text-loss border border-loss/30 bg-loss/10 rounded-md px-3 py-2">
          {state.message}
        </p>
      )}

      {state.status === "ok" && state.imported && (
        <div className="mt-3 text-sm text-gain border border-gain/30 bg-gain/10 rounded-md px-3 py-2 space-y-1">
          <p>
            {t("importDone", {
              holdings: state.imported.holdings,
              accounts: state.imported.accounts,
            })}
          </p>
          {state.imported.zombies > 0 && (
            <p className="text-muted-strong">
              {t("importZombies", { count: state.imported.zombies })}
            </p>
          )}
          {state.imported.warnings.map((w, i) => (
            <p key={i} className="text-muted-strong">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted">{t("importFormat")}</p>
    </form>
  )
}
