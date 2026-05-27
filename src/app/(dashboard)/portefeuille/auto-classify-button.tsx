"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { autoClassifyAction, type AutoClassifyResult } from "@/server/portfolio/auto-classify"

export function AutoClassifyButton({ unclassifiedCount }: { unclassifiedCount: number }) {
  const t = useTranslations("portfolio")
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AutoClassifyResult | null>(null)

  if (unclassifiedCount === 0 && !result) return null

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4 flex flex-wrap items-center gap-4 justify-between">
      <div className="text-sm">
        <p className="text-muted-strong">
          {unclassifiedCount > 0
            ? t("unclassifiedCount", { count: unclassifiedCount })
            : t("allClassified")}
        </p>
        {result?.ok && (
          <div className="mt-1 space-y-0.5 text-[11px]">
            <p className="text-gain">
              {t("classifiedSummary", { count: result.classified })}
              {result.classified_ai > 0 && (
                <span className="text-muted ml-1">
                  {t("classifiedSplit", { rule: result.classified_rule, ai: result.classified_ai })}
                </span>
              )}
            </p>
            {result.unknown > 0 && (
              <p className="text-muted-strong">
                {t("unknownLeft", { count: result.unknown })}
              </p>
            )}
            {result.ai_cost_usd !== undefined && result.ai_cost_usd > 0 && (
              <p className="text-muted">{t("aiCost", { amount: result.ai_cost_usd.toFixed(4) })}</p>
            )}
            {result.ai_error && (
              <p className="text-loss">{t("aiError", { message: result.ai_error })}</p>
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
          {pending ? t("classifying") : t("autoClassify")}
        </button>
      )}
    </div>
  )
}
