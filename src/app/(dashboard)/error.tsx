"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("errors")
  const tCommon = useTranslations("common")

  useEffect(() => {
    console.error("Dashboard error boundary:", error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-loss mb-3">
        {t("kicker")}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight mb-3">{t("title")}</h1>
      <p className="text-sm text-muted-strong mb-6">{t("intro")}</p>
      {error.message && (
        <pre className="text-xs text-loss text-left bg-loss/5 border border-loss/30 rounded-md p-3 overflow-x-auto mb-6 font-mono">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#1a1206] hover:brightness-110 transition"
      >
        {tCommon("retry")}
      </button>
    </div>
  )
}
