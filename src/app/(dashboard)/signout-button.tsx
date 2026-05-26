"use client"

import { useTransition } from "react"
import { signOutAction } from "@/app/(auth)/actions"

export function SignOutButton() {
  const [pending, startTransition] = useTransition()
  return (
    <form
      action={() => startTransition(() => signOutAction())}
    >
      <button
        type="submit"
        disabled={pending}
        className="text-xs uppercase tracking-[0.18em] font-mono text-muted hover:text-loss transition-colors disabled:opacity-60"
      >
        {pending ? "…" : "Déconnexion"}
      </button>
    </form>
  )
}
