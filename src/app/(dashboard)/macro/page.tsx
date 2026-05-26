import { fetchMacroOverview, isStale } from "@/server/macro/queries"
import { Disclaimer } from "@/components/disclaimer"
import { SeriesChart } from "./series-chart"

export const metadata = { title: "Macro — Liquidity Lens" }

const SERIES_COLOR: Record<string, string> = {
  "fred:M2SL":     "#f5b454", // accent ambre
  "fred:CPIAUCSL": "#f0586a", // rouge (inflation)
  "fred:DFEDTARU": "#22d3ee", // cyan
  "fred:DFEDTARL": "#0891b2",
  "fred:WALCL":    "#a78bfa",
}

const ORDER = ["fred:M2SL", "fred:CPIAUCSL", "fred:DFEDTARU", "fred:WALCL"]

export default async function MacroPage() {
  const { series, upcomingEvents } = await fetchMacroOverview()

  const sorted = [...series].sort(
    (a, b) => (ORDER.indexOf(a.key) === -1 ? 99 : ORDER.indexOf(a.key))
            - (ORDER.indexOf(b.key) === -1 ? 99 : ORDER.indexOf(b.key)),
  )

  const totalPoints = series.reduce((s, x) => s + x.points.length, 0)
  const noData = totalPoints === 0

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
            Macro
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Liquidité, prix, taux directeurs
          </h1>
          <p className="mt-2 text-muted max-w-xl">
            Données FRED (Federal Reserve Bank of St. Louis). Rafraîchissement
            quotidien à 06:00 UTC. M2 global agrégé reporté à la prochaine
            itération.
          </p>
        </div>
      </header>

      {noData && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-5 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-loss mb-2">
            Aucune donnée macro
          </p>
          <p className="text-muted-strong">
            Le cron quotidien n&apos;a pas encore tourné, ou la variable{" "}
            <code className="font-mono text-accent">FRED_API_KEY</code> n&apos;est
            pas configurée. Tu peux déclencher un rafraîchissement manuel via{" "}
            <code className="font-mono">GET /api/cron/macro</code> après avoir
            ajouté la clé.
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sorted.map((s) => (
          <SeriesCard
            key={s.key}
            label={s.label}
            unit={s.unit}
            frequency={s.frequency}
            points={s.points}
            latestDate={s.latest?.date ?? null}
            latestValue={s.latest?.value ?? null}
            yoyPct={s.yoyPct}
            color={SERIES_COLOR[s.key] ?? "#f5b454"}
            stale={isStale(s.latest)}
          />
        ))}
      </section>

      <section className="rounded-lg border border-border bg-surface/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-4">
          Prochains catalyseurs
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted">Aucun événement à venir.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {upcomingEvents.map((e) => {
              const date = new Date(e.scheduledAt)
              const days = Math.max(
                0,
                Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
              )
              return (
                <li
                  key={e.id}
                  className="py-2.5 grid grid-cols-[6rem_1fr_auto] gap-3 items-center text-sm"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-strong">
                    {e.kind === "fomc" ? "FOMC" : "CPI"}
                  </span>
                  <span className="text-foreground">{e.title}</span>
                  <span className="font-mono tabular-nums text-xs text-muted text-right">
                    {date.toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" })}
                    <span className="ml-2 text-accent">J-{days}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Disclaimer variant="inline" />
    </div>
  )
}

function SeriesCard({
  label,
  unit,
  frequency,
  points,
  latestDate,
  latestValue,
  yoyPct,
  color,
  stale,
}: {
  label: string
  unit: string | null
  frequency: string | null
  points: { date: string; value: number }[]
  latestDate: string | null
  latestValue: number | null
  yoyPct: number | null
  color: string
  stale: boolean
}) {
  const fmt = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 })
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-5">
      <header className="flex items-start justify-between mb-3 gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
            {label}
          </p>
          <p className="mt-2 font-mono tabular-nums text-2xl text-foreground">
            {latestValue !== null
              ? `${fmt.format(latestValue)}${unit ? " " + unit : ""}`
              : "—"}
          </p>
        </div>
        <div className="text-right">
          {yoyPct !== null && (
            <p
              className={`font-mono tabular-nums text-sm ${
                yoyPct > 0 ? "text-gain" : yoyPct < 0 ? "text-loss" : "text-muted-strong"
              }`}
            >
              {yoyPct > 0 ? "+" : ""}{yoyPct.toFixed(2)} % YoY
            </p>
          )}
          {latestDate && (
            <p className="text-[11px] text-muted mt-1">
              {new Date(latestDate).toLocaleDateString("fr-CA", { month: "short", year: "numeric" })}
              {stale && <span className="ml-1 text-loss">· stale</span>}
            </p>
          )}
          {frequency && (
            <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
              {frequency}
            </p>
          )}
        </div>
      </header>
      <SeriesChart points={points} unit={unit} color={color} />
    </div>
  )
}
