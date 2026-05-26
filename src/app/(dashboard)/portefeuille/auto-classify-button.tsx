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
          <p className="mt-1 text-[11px] text-gain">
            {result.classified} classifiée{result.classified > 1 ? "s" : ""}.{" "}
            {result.unknown > 0 && `${result.unknown} inconnue${result.unknown > 1 ? "s" : ""} (à classer manuellement).`}
          </p>
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
