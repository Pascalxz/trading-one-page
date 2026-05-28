import { getLocale, getTranslations } from "next-intl/server"
import { fetchProtocols, type ProtocolView } from "@/server/projets/queries"
import { Disclaimer } from "@/components/disclaimer"
import { formatNumber, pnlClass } from "@/lib/format"

export async function generateMetadata() {
  const t = await getTranslations("projects")
  return { title: `${t("kicker")} — Liquidity Lens` }
}

export default async function ProjetsPage() {
  const t = await getTranslations("projects")
  const locale = await getLocale()
  const localeStr = locale === "fr" ? "fr-CA" : "en-CA"
  const protocols = await fetchProtocols()

  const noDev = protocols.every((p) => p.dev === null)
  const noMarket = protocols.every((p) => p.market === null)

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          {t("kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted max-w-2xl">
          {t("intro")}{" "}
          <span className="text-muted-strong">{t("introBold")}</span>
        </p>
      </header>

      {noDev && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-loss mb-2">
            {t("noDevTitle")}
          </p>
          <p className="text-muted-strong">
            {t.rich("noDevHelp", {
              path: () => <code className="font-mono text-accent">/api/cron/dev</code>,
              key: () => <code className="font-mono">GITHUB_TOKEN</code>,
              trigger: () => <code className="font-mono">GET /api/cron/dev</code>,
            })}
          </p>
        </div>
      )}

      {noMarket && (
        <div className="rounded-lg border border-border bg-surface/40 p-4 text-sm text-muted-strong">
          {t("marketError")}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {protocols.map((p) => (
          <ProtocolCard key={p.instrumentId} protocol={p} locale={localeStr} />
        ))}
      </section>

      <Disclaimer variant="inline" />
    </div>
  )
}

async function ProtocolCard({
  protocol,
  locale,
}: {
  protocol: ProtocolView
  locale: string
}) {
  const t = await getTranslations("projects")
  const m = protocol.market
  const d = protocol.dev
  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
  const lastReleaseDate = d?.lastReleaseAt
    ? new Date(d.lastReleaseAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null
  const daysSinceRelease = d?.lastReleaseAt
    ? Math.floor((Date.now() - new Date(d.lastReleaseAt).getTime()) / 86_400_000)
    : null

  return (
    <article className="rounded-lg border border-border bg-surface/40 p-5 space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
            {protocol.symbol} · {protocol.description}
          </p>
          <p className="mt-2 font-mono tabular-nums text-2xl text-foreground">
            {m?.current_price !== null && m?.current_price !== undefined
              ? usd.format(m.current_price)
              : "—"}
          </p>
          {m?.market_cap !== null && m?.market_cap !== undefined && (
            <p className="text-[11px] text-muted mt-1">
              Market cap {compact.format(m.market_cap)} ·{" "}
              {m.market_cap_rank ? `#${m.market_cap_rank}` : ""}
            </p>
          )}
        </div>
        <div className="text-right text-sm space-y-0.5">
          <PctChange label="24h" value={m?.price_change_percentage_24h ?? null} />
          <PctChange label="7j" value={m?.price_change_percentage_7d_in_currency ?? null} />
          <PctChange label="30j" value={m?.price_change_percentage_30d_in_currency ?? null} />
        </div>
      </header>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
            {t("devActivity")}
          </p>
          <a
            href={`https://github.com/${protocol.githubRepo}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-muted-strong hover:text-accent transition-colors font-mono"
          >
            {protocol.githubRepo} ↗
          </a>
        </div>

        {d ? (
          <div className="grid grid-cols-4 gap-3">
            <DevStat label={t("commits7d")} value={d.commits7d} />
            <DevStat label={t("commits30d")} value={d.commits30d} />
            <DevStat label={t("contributors30d")} value={d.contributors30d} />
            <DevStat label={t("stars")} value={d.stars} compactValue locale={locale} />
          </div>
        ) : (
          <p className="text-xs text-muted">{t("noData")}</p>
        )}

        {d?.lastReleaseTag && (
          <p className="text-[11px] text-muted-strong mt-3">
            {t("lastRelease")}{" "}
            <span className="font-mono text-accent">{d.lastReleaseTag}</span>
            {lastReleaseDate && (
              <>
                {" · "}
                {lastReleaseDate}
                {daysSinceRelease !== null && (
                  <span className="text-muted ml-1">
                    {t("daysAgo", { days: daysSinceRelease })}
                  </span>
                )}
              </>
            )}
          </p>
        )}
      </div>

      {protocol.userExposureSymbols.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-2">
            {t("exposure")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {protocol.userExposureSymbols.map((sym) => (
              <span
                key={sym}
                className="font-mono text-[11px] rounded border border-accent/40 bg-accent-soft px-2 py-0.5 text-accent"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function PctChange({ label, value }: { label: string; value: number | null }) {
  return (
    <p className="font-mono tabular-nums text-xs">
      <span className="text-muted mr-2">{label}</span>
      <span className={pnlClass(value)}>
        {value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)} %`}
      </span>
    </p>
  )
}

function DevStat({
  label,
  value,
  compactValue,
  locale = "fr-CA",
}: {
  label: string
  value: number | null
  compactValue?: boolean
  locale?: string
}) {
  const fmt = (v: number) =>
    compactValue
      ? new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(v)
      : formatNumber(v, 0)
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted font-mono">{label}</p>
      <p className="font-mono tabular-nums text-foreground text-base mt-0.5">
        {value === null ? "—" : fmt(value)}
      </p>
    </div>
  )
}
