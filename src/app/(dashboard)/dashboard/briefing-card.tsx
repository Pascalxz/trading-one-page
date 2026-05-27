"use client"

import { useState, useTransition } from "react"
import { generateMyBriefingAction } from "@/server/ai/briefing-action"

export function BriefingCard({
  initialContent,
  initialDate,
  hasHoldings,
}: {
  initialContent: string | null
  initialDate: string | null
  hasHoldings: boolean
}) {
  const [content, setContent] = useState(initialContent)
  const [date, setDate] = useState(initialDate)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function generate(force = false) {
    startTransition(async () => {
      setError(null)
      const r = await generateMyBriefingAction(force)
      if (!r.ok) {
        setError(r.message ?? "Erreur.")
      } else if (r.message) {
        // No new content (already generated) — keep what we have
      } else {
        // Regenerated — refresh from page revalidate
        location.reload()
      }
    })
  }

  return (
    <section className="rounded-lg border border-border bg-surface/40 p-6">
      <header className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-accent">
            Briefing du jour
          </p>
          {date && (
            <p className="text-[11px] text-muted mt-1 font-mono">
              {new Date(date).toLocaleDateString("fr-CA", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        {hasHoldings && (
          <button
            type="button"
            onClick={() => generate(true)}
            disabled={pending}
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-strong hover:text-accent transition-colors disabled:opacity-50"
          >
            {pending ? "…" : content ? "Régénérer" : "Générer"}
          </button>
        )}
      </header>

      {!hasHoldings && (
        <p className="text-sm text-muted">
          Importe d&apos;abord un portefeuille (onglet Portefeuille) pour
          obtenir un briefing personnalisé.
        </p>
      )}

      {hasHoldings && !content && !pending && (
        <div className="space-y-3">
          <p className="text-sm text-muted-strong">
            Aucun briefing pour aujourd&apos;hui. Le cron quotidien s&apos;exécute à
            11:00 UTC (07:00 ET) — ou clique « Générer » pour le créer maintenant.
          </p>
          <button
            type="button"
            onClick={() => generate(false)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#1a1206] hover:brightness-110 transition"
          >
            Générer le briefing
          </button>
        </div>
      )}

      {pending && !content && (
        <p className="text-sm text-muted animate-pulse">
          Génération en cours… (~5-15 sec.)
        </p>
      )}

      {content && (
        <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-loss border border-loss/30 bg-loss/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <p className="mt-4 pt-3 border-t border-border text-[11px] text-muted leading-relaxed">
        Outil d&apos;information. Ne constitue pas un conseil financier. Les
        données affichées peuvent être incomplètes ou périmées.
      </p>
    </section>
  )
}
