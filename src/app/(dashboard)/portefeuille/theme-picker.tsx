"use client"

import { useState, useTransition } from "react"
import { assignThemeAction } from "@/server/portfolio/theme-action"
import type { ThemeOption } from "@/server/portfolio/queries"

export function ThemePicker({
  holdingId,
  current,
  themes,
}: {
  holdingId: string
  current: { id: string | null; name: string | null; color: string | null }
  themes: ThemeOption[]
}) {
  const [value, setValue] = useState(current.id ?? "")
  const [pending, startTransition] = useTransition()

  const display = themes.find((t) => t.id === value)

  return (
    <label className="inline-flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: display?.color ?? "#475569" }}
      />
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value
          setValue(next)
          startTransition(async () => {
            await assignThemeAction(holdingId, next === "" ? null : next)
          })
        }}
        className="bg-transparent text-xs text-muted-strong hover:text-foreground focus:outline-none cursor-pointer disabled:opacity-50"
      >
        <option value="">Sans thème</option>
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  )
}
