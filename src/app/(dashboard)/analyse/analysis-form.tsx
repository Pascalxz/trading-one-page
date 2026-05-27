"use client"

import { useActionState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  askAnalysisAction,
  analysisInitialState,
  type AnalysisState,
} from "@/server/ai/analysis"

export function AnalysisForm() {
  const t = useTranslations("analysis")
  const locale = useLocale()
  const numFmt = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA")
  const [state, formAction, pending] = useActionState<AnalysisState, FormData>(
    askAnalysisAction,
    analysisInitialState,
  )

  const suggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
    t("suggestion4"),
  ]

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className="block text-xs uppercase tracking-[0.18em] text-muted mb-2 font-mono">
            {t("question")}
          </span>
          <textarea
            name="question"
            required
            rows={3}
            maxLength={2000}
            defaultValue={state.question ?? ""}
            placeholder={t("questionPlaceholder")}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition resize-none"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <SuggestButton key={s} text={s} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted">{t("snapshotNote")}</p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#1a1206] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {pending ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>

      {state.status === "error" && (
        <div className="rounded-md border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </div>
      )}

      {state.status === "ok" && state.answer && (
        <article className="rounded-lg border border-border bg-surface/40 p-5">
          <header className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-accent">
              {t("answerTitle")}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted font-mono">
              {state.tokens && (
                <span>
                  {numFmt.format(state.tokens.in)} in / {numFmt.format(state.tokens.out)} out
                </span>
              )}
              {state.costUsd !== undefined && <span>${state.costUsd.toFixed(4)} USD</span>}
              {state.durationMs !== undefined && (
                <span>{(state.durationMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          </header>
          <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
            {state.answer}
          </div>
          <p className="mt-4 pt-3 border-t border-border text-[11px] text-muted leading-relaxed">
            {t("footer")}
          </p>
        </article>
      )}
    </div>
  )
}

function SuggestButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const form = (e.currentTarget as HTMLButtonElement).closest("form")
        const textarea = form?.querySelector<HTMLTextAreaElement>("textarea[name='question']")
        if (textarea) {
          textarea.value = text
          textarea.focus()
        }
      }}
      className="rounded-full border border-border-strong bg-surface-2 px-3 py-1 text-[11px] text-muted-strong hover:text-foreground hover:border-foreground/40 transition-colors"
    >
      {text}
    </button>
  )
}
