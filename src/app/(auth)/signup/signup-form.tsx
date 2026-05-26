"use client"

import { useActionState } from "react"
import { signUpAction, type AuthState } from "../actions"

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    undefined,
  )

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nom affiché (optionnel)" name="display_name" type="text" />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="8 caractères minimum."
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
        {pending ? "Création…" : "Créer mon compte"}
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
  hint,
}: {
  label: string
  name: string
  type: string
  autoComplete?: string
  required?: boolean
  hint?: string
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
      {hint && <span className="block mt-1 text-[11px] text-muted">{hint}</span>}
    </label>
  )
}
