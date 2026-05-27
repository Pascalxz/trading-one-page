"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { signInAction, type AuthState } from "../actions"

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("auth")
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    undefined,
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <Field label={t("email")} name="email" type="email" autoComplete="email" required />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state?.error && (
        <p className="text-sm text-loss border border-loss/30 bg-loss/10 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-[#1a1206] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? t("signingIn") : t("signInCta")}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  type,
  autoComplete,
  required,
}: {
  label: string
  name: string
  type: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.18em] text-muted mb-1.5 font-mono">
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
      />
    </label>
  )
}
