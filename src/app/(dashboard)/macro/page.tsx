import { getLocale, getTranslations } from "next-intl/server"
import { fetchMacroOverview, isStale, type MacroSeriesData } from "@/server/macro/queries"
import { Disclaimer } from "@/components/disclaimer"
import { SeriesChart } from "./series-chart"

export async function generateMetadata() {
  const t = await getTranslations("macro")
  return { title: `${t("kicker")} — Liquidity Lens` }
}

const SERIES_COLOR: Record<string, string> = {
  // Liquidité — palette ambre / orange / pourpre
  "derived:m2_global":     "#fbbf24",
  "derived:net_liquidity": "#f59e0b",
  "fred:WALCL":            "#a78bfa",
  "fred:WTREGEN":          "#fb7185",
  "fred:RRPONTSYD":        "#f472b6",
  "fred:M2SL":             "#f5b454",
  // Inflation & taux — palette rouge / cyan
  "fred:CPIAUCSL":         "#f0586a",
  "fred:DFEDTARU":         "#22d3ee",
  "fred:DGS10":            "#34d399",
  "fred:DGS2":             "#10b981",
  "fred:T10Y2Y":           "#60a5fa",
  // Dollar, or, conditions — palette neutre + or
  "fred:DTWEXBGS":         "#94a3b8",
  "fred:GOLDAMGBD228NLBM": "#facc15",
  "fred:NFCI":             "#c084fc",
  // Sentiment
  "altme:fng_crypto":      "#f97316",
  "cnn:fng_stocks":        "#06b6d4",
}

const SECTIONS = [
  {
    titleKey: "sectionLiquidity",
    keys: [
      "derived:m2_global",
      "derived:net_liquidity",
      "fred:WALCL",
      "fred:WTREGEN",
      "fred:RRPONTSYD",
      "fred:M2SL",
    ],
  },
  {
    titleKey: "sectionRates",
    keys: [
      "fred:CPIAUCSL",
      "fred:DFEDTARU",
      "fred:DGS10",
      "fred:DGS2",
      "fred:T10Y2Y",
    ],
  },
  {
    titleKey: "sectionDollarGold",
    keys: ["fred:DTWEXBGS", "fred:GOLDAMGBD228NLBM", "fred:NFCI"],
  },
  {
    titleKey: "sectionSentiment",
    keys: ["altme:fng_crypto", "cnn:fng_stocks"],
  },
] as const

export default async function MacroPage() {
  const t = await getTranslations("macro")
  const locale = await getLocale()
  const localeStr = locale === "fr" ? "fr-CA" : "en-CA"

  const { series, upcomingEvents } = await fetchMacroOverview()
  const byKey = new Map(series.map((s) => [s.key, s]))

  const totalPoints = series.reduce((s, x) => s + x.points.length, 0)
  const noData = totalPoints === 0

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
            {t("kicker")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted max-w-xl">{t("intro")}</p>
        </div>
      </header>

      {noData && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-5 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-loss mb-2">
            {t("noDataTitle")}
          </p>
          <p className="text-muted-strong">
            {t.rich("noDataHelp", {
              key: () => <code className="font-mono text-accent">FRED_API_KEY</code>,
              path: () => <code className="font-mono">GET /api/cron/macro</code>,
            })}
          </p>
        </div>
      )}

      {SECTIONS.map((section) => {
        const sectionSeries = section.keys
          .map((k) => byKey.get(k))
          .filter((s): s is MacroSeriesData => Boolean(s))
        if (sectionSeries.length === 0) return null
        return (
          <section key={section.titleKey} className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted-strong border-b border-border pb-2">
              {t(section.titleKey)}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sectionSeries.map((s) => (
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
                  staleLabel={t("stale")}
                  locale={localeStr}
                />
              ))}
            </div>
          </section>
        )
      })}

      <section className="rounded-lg border border-border bg-surface/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-4">
          {t("upcomingTitle")}
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted">{t("upcomingNone")}</p>
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
                    {date.toLocaleDateString(localeStr, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    <span className="ml-2 text-accent">
                      {locale === "fr" ? "J-" : "T-"}
                      {days}
                    </span>
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
  staleLabel,
  locale,
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
  staleLabel: string
  locale: string
}) {
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
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
              {yoyPct > 0 ? "+" : ""}
              {yoyPct.toFixed(2)} % YoY
            </p>
          )}
          {latestDate && (
            <p className="text-[11px] text-muted mt-1">
              {new Date(latestDate).toLocaleDateString(locale, {
                month: "short",
                year: "numeric",
              })}
              {stale && <span className="ml-1 text-loss">· {staleLabel}</span>}
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
