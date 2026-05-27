"use client"

import { useActionState } from "react"
import {
  askAnalysisAction,
  analysisInitialState,
  type AnalysisState,
} from "@/server/ai/analysis"

const SUGGESTIONS = [
  "Quelle est mon exposition réelle au Bitcoin ?",
  "Quelles positions sont corrélées à la liquidité macro ?",
  "Sur quels protocoles l'activité dev s'essouffle-t-elle ?",
  "Où en est mon portefeuille aujourd'hui ?",
]

export function AnalysisForm() {
  const [state, formAction, pending] = useActionState<AnalysisState, FormData>(
    askAnalysisAction,
    analysisInitialState,
  )

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className="block text-xs uppercase tracking-[0.18em] text-muted mb-2 font-mono">
            Ta question
          </span>
          <textarea
            name="question"
            required
            rows={3}
            maxLength={2000}
            defaultValue={state.question ?? ""}
            placeholder="Ex : quelle est mon exposition au Bitcoin ?"
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition resize-none"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <SuggestButton key={s} text={s} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted">
            L&apos;IA reçoit un snapshot de ton portefeuille, du macro et de l&apos;activité dev.
            Pas de recommandation d&apos;achat/vente.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#1a1206] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {pending ? "Analyse…" : "Analyser"}
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
              Réponse
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted font-mono">
              {state.tokens && (
                <span>
                  {state.tokens.in.toLocaleString("fr-CA")} in /{" "}
                  {state.tokens.out.toLocaleString("fr-CA")} out
                </span>
              )}
              {state.costUsd !== undefined && (
                <span>${state.costUsd.toFixed(4)} USD</span>
              )}
              {state.durationMs !== undefined && (
                <span>{(state.durationMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          </header>
          <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
            {state.answer}
          </div>
          <p className="mt-4 pt-3 border-t border-border text-[11px] text-muted leading-relaxed">
            Outil d&apos;information. Ne constitue pas un conseil financier. L&apos;utilisateur
            est seul responsable de ses décisions.
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
