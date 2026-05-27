import { fetchProtocols, type ProtocolView } from "@/server/projets/queries"
import { Disclaimer } from "@/components/disclaimer"
import { formatNumber, pnlClass } from "@/lib/format"

export const metadata = { title: "Projets — Liquidity Lens" }

export default async function ProjetsPage() {
  const protocols = await fetchProtocols()

  const noDev = protocols.every((p) => p.dev === null)
  const noMarket = protocols.every((p) => p.market === null)

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          Projets
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Prix marché · activité de développement
        </h1>
        <p className="mt-2 text-muted max-w-2xl">
          Pour chaque protocole tracké : prix CoinGecko en direct + métriques
          GitHub (commits, contributeurs, releases). L&apos;idée :{" "}
          <span className="text-muted-strong">
            voir si le projet avance vraiment, indépendamment du prix.
          </span>
        </p>
      </header>

      {noDev && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-loss mb-2">
            Activité dev non chargée
          </p>
          <p className="text-muted-strong">
            Le cron <code className="font-mono text-accent">/api/cron/dev</code>{" "}
            n&apos;a pas encore tourné, ou <code className="font-mono">GITHUB_TOKEN</code> n&apos;est
            pas configuré. Trigger manuel via <code className="font-mono">GET /api/cron/dev</code>.
          </p>
        </div>
      )}

      {noMarket && (
        <div className="rounded-lg border border-border bg-surface/40 p-4 text-sm text-muted-strong">
          ⚠ CoinGecko a renvoyé une erreur (rate limit ou réseau). Les cartes
          afficheront les données dev seules. Recharge la page dans quelques
          minutes.
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {protocols.map((p) => (
          <ProtocolCard key={p.instrumentId} protocol={p} />
        ))}
      </section>

      <Disclaimer variant="inline" />
    </div>
  )
}

function ProtocolCard({ protocol }: { protocol: ProtocolView }) {
  const m = protocol.market
  const d = protocol.dev
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
  const lastReleaseDate = d?.lastReleaseAt
    ? new Date(d.lastReleaseAt).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" })
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
            {m?.current_price !== null && m?.current_price !== undefined ? usd.format(m.current_price) : "—"}
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
          <PctChange label="7j"  value={m?.price_change_percentage_7d_in_currency ?? null} />
          <PctChange label="30j" value={m?.price_change_percentage_30d_in_currency ?? null} />
        </div>
      </header>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
            Activité dev
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
            <DevStat label="Commits 7j" value={d.commits7d} />
            <DevStat label="Commits 30j" value={d.commits30d} />
            <DevStat label="Contrib. 30j" value={d.contributors30d} />
            <DevStat label="Stars" value={d.stars} compactValue />
          </div>
        ) : (
          <p className="text-xs text-muted">Pas encore de données.</p>
        )}

        {d?.lastReleaseTag && (
          <p className="text-[11px] text-muted-strong mt-3">
            Dernière release :{" "}
            <span className="font-mono text-accent">{d.lastReleaseTag}</span>
            {lastReleaseDate && (
              <>
                {" · "}
                {lastReleaseDate}
                {daysSinceRelease !== null && (
                  <span className="text-muted ml-1">(il y a {daysSinceRelease} j)</span>
                )}
              </>
            )}
          </p>
        )}
      </div>

      {protocol.userExposureSymbols.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-2">
            Ton exposition
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
}: {
  label: string
  value: number | null
  compactValue?: boolean
}) {
  const fmt = (v: number) =>
    compactValue
      ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)
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
