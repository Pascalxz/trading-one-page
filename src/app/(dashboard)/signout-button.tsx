"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { signOutAction } from "@/app/(auth)/actions"

export function SignOutButton() {
  const t = useTranslations("auth")
  const [pending, startTransition] = useTransition()
  return (
    <form action={() => startTransition(() => signOutAction())}>
      <button
        type="submit"
        disabled={pending}
        className="text-xs uppercase tracking-[0.18em] font-mono text-muted hover:text-loss transition-colors disabled:opacity-60"
      >
        {pending ? "…" : t("signOut")}
      </button>
    </form>
  )
}
