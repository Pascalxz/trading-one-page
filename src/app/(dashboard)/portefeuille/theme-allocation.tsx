import type { ThemeAllocation as Allocation } from "@/lib/finance/calcs"
import { formatMoney } from "@/lib/format"

export function ThemeAllocation({
  allocations,
  currency,
}: {
  allocations: Allocation[]
  currency: string
}) {
  if (allocations.length === 0) return null
  const max = Math.max(...allocations.map((a) => a.weight))

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-5">
      <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-4">
        Répartition par thème
      </h2>
      <ul className="space-y-3">
        {allocations.map((a) => (
          <li key={a.themeId ?? "none"} className="grid grid-cols-[12rem_1fr_auto] gap-4 items-center">
            <span className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colorForBar(a) }}
              />
              <span className="truncate text-muted-strong">{a.themeName}</span>
              <span className="text-[11px] text-muted">({a.count})</span>
            </span>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(a.weight / max) * 100}%`,
                  backgroundColor: colorForBar(a),
                }}
              />
            </div>
            <span className="font-mono tabular-nums text-sm text-right">
              <span className="text-foreground">{a.weight.toFixed(1)} %</span>
              <span className="block text-[11px] text-muted">
                {formatMoney(a.marketValueRef, currency)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function colorForBar(a: Allocation): string {
  // La couleur "officielle" du thème n'est pas embarquée ici (les allocations
  // n'ont que id/name/value). On dérive un teinté ambre par défaut.
  if (a.themeId === null) return "#64748b"
  // Palette stable selon le nom (hash très simple)
  const palette = [
    "#f59e0b", "#a78bfa", "#22d3ee", "#34d399", "#60a5fa",
    "#fb7185", "#f472b6", "#c084fc", "#94a3b8",
  ]
  let h = 0
  for (let i = 0; i < a.themeName.length; i++) h = (h * 31 + a.themeName.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}
