"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { setLocaleAction } from "@/server/locale-action"
import type { Locale } from "@/i18n/request"

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher")
  const current = useLocale() as Locale
  const [pending, startTransition] = useTransition()

  const target: Locale = current === "fr" ? "en" : "fr"
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setLocaleAction(target))}
      aria-label={t("label")}
      className="font-mono text-xs uppercase tracking-[0.18em] text-muted hover:text-accent transition-colors disabled:opacity-50"
    >
      {pending ? "…" : t(current)} / <span className="text-muted-strong">{t(target)}</span>
    </button>
  )
}
