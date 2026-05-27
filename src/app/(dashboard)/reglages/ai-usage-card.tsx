import type { AiUsage } from "@/server/ai/usage-queries"

export function AiUsageCard({ usage }: { usage: AiUsage }) {
  const usdFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
  const numFmt = new Intl.NumberFormat("fr-CA")

  const budgetPct = usage.budget.budget_today > 0
    ? (usage.budget.used_today / usage.budget.budget_today) * 100
    : 0

  const maxDaily = Math.max(1, ...usage.daily.map((d) => d.tokens))

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
        Consommation IA
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile
          label="Aujourd'hui"
          primary={`${numFmt.format(usage.today.tokens_in + usage.today.tokens_out)} tokens`}
          secondary={`${usage.today.runs} appel${usage.today.runs > 1 ? "s" : ""} · ${usdFmt.format(usage.today.cost_usd)}`}
        />
        <Tile
          label="7 jours"
          primary={`${numFmt.format(usage.week.tokens_in + usage.week.tokens_out)} tokens`}
          secondary={`${usage.week.runs} appels · ${usdFmt.format(usage.week.cost_usd)}`}
        />
        <Tile
          label="30 jours"
          primary={`${numFmt.format(usage.thirtyDays.tokens_in + usage.thirtyDays.tokens_out)} tokens`}
          secondary={`${usage.thirtyDays.runs} appels · ${usdFmt.format(usage.thirtyDays.cost_usd)}`}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface/40 p-5">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.18em] text-muted mb-3">
          <span>Budget quotidien</span>
          <span className={budgetPct >= 90 ? "text-loss" : "text-muted-strong"}>
            {numFmt.format(usage.budget.used_today)} / {numFmt.format(usage.budget.budget_today)}
          </span>
        </div>
        <div
          className="h-2 bg-border rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(budgetPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Pourcentage du budget IA quotidien utilisé"
        >
          <div
            className={`h-full transition-all ${budgetPct >= 90 ? "bg-loss" : "bg-accent"}`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Reste {numFmt.format(usage.budget.remaining_today)} tokens aujourd&apos;hui.
          Plafond modifiable dans la DB (`profiles.ai_token_budget`).
        </p>
      </div>

      {usage.byMode.length > 0 && (
        <div className="rounded-lg border border-border bg-surface/40 p-5">
          <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted mb-3">
            Par mode (30 jours)
          </h3>
          <table className="w-full text-sm">
            <thead className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted">
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">Mode</th>
                <th className="text-right py-2 font-medium">Appels</th>
                <th className="text-right py-2 font-medium">Tokens in</th>
                <th className="text-right py-2 font-medium">Tokens out</th>
                <th className="text-right py-2 font-medium">Coût</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {usage.byMode.map((m) => (
                <tr key={m.mode} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-foreground">{labelForMode(m.mode)}</td>
                  <td className="py-2 text-right text-muted-strong">{numFmt.format(m.runs)}</td>
                  <td className="py-2 text-right text-muted-strong">{numFmt.format(m.tokens_in)}</td>
                  <td className="py-2 text-right text-muted-strong">{numFmt.format(m.tokens_out)}</td>
                  <td className="py-2 text-right text-foreground">{usdFmt.format(m.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface/40 p-5">
        <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted mb-3">
          Quotidien (30 derniers jours)
        </h3>
        <div className="flex items-end gap-1 h-24">
          {usage.daily.map((d) => {
            const h = (d.tokens / maxDaily) * 100
            return (
              <div
                key={d.date}
                className="flex-1 bg-accent/30 hover:bg-accent rounded-sm transition-colors min-h-[1px]"
                style={{ height: `${Math.max(2, h)}%` }}
                title={`${d.date} · ${numFmt.format(d.tokens)} tokens · ${d.runs} appels · ${usdFmt.format(d.cost_usd)}`}
              />
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted font-mono">
          <span>{usage.daily[0]?.date.slice(5)}</span>
          <span>{usage.daily[usage.daily.length - 1]?.date.slice(5)}</span>
        </div>
      </div>
    </section>
  )
}

function labelForMode(mode: string): string {
  switch (mode) {
    case "briefing": return "Briefing quotidien"
    case "analysis": return "Analyse à la demande"
    case "alert":    return "Alerte enrichie"
    case "agent":    return "Agent"
    default:         return mode
  }
}

function Tile({
  label,
  primary,
  secondary,
}: {
  label: string
  primary: string
  secondary: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-5">
      <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <p className="mt-3 font-mono tabular-nums text-2xl text-foreground">
        {primary}
      </p>
      <p className="mt-1 text-xs text-muted-strong font-mono">{secondary}</p>
    </div>
  )
}
