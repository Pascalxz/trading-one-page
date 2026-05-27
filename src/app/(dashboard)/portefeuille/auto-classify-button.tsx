"use client"

import { useState, useTransition } from "react"
import { autoClassifyAction, type AutoClassifyResult } from "@/server/portfolio/auto-classify"

export function AutoClassifyButton({ unclassifiedCount }: { unclassifiedCount: number }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AutoClassifyResult | null>(null)

  if (unclassifiedCount === 0 && !result) return null

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4 flex flex-wrap items-center gap-4 justify-between">
      <div className="text-sm">
        <p className="text-muted-strong">
          {unclassifiedCount > 0 ? (
            <>
              <span className="font-mono tabular-nums text-foreground">{unclassifiedCount}</span>{" "}
              position{unclassifiedCount > 1 ? "s" : ""} sans thème
            </>
          ) : (
            "Toutes les positions sont classifiées."
          )}
        </p>
        {result?.ok && (
          <div className="mt-1 space-y-0.5 text-[11px]">
            <p className="text-gain">
              {result.classified} classifiée{result.classified > 1 ? "s" : ""}
              {result.classified_ai > 0 && (
                <span className="text-muted ml-1">
                  ({result.classified_rule} par règle, {result.classified_ai} via IA)
                </span>
              )}
            </p>
            {result.unknown > 0 && (
              <p className="text-muted-strong">
                {result.unknown} inconnue{result.unknown > 1 ? "s" : ""} (à classer manuellement).
              </p>
            )}
            {result.ai_cost_usd !== undefined && result.ai_cost_usd > 0 && (
              <p className="text-muted">Coût IA : ${result.ai_cost_usd.toFixed(4)} USD</p>
            )}
            {result.ai_error && (
              <p className="text-loss">Fallback IA en échec : {result.ai_error}</p>
            )}
          </div>
        )}
        {result && !result.ok && (
          <p className="mt-1 text-[11px] text-loss">{result.error}</p>
        )}
      </div>
      {unclassifiedCount > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await autoClassifyAction()
              setResult(r)
            })
          }
          className="rounded-md border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm text-accent hover:bg-accent/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Classification…" : "Auto-classifier"}
        </button>
      )}
    </div>
  )
}
