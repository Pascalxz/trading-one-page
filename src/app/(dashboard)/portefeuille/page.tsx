import { fetchPortfolio } from "@/server/portfolio/queries"
import {
  computeTotals,
  withWeights,
  allocationByTheme,
  type HoldingValue,
  type FxRates,
} from "@/lib/finance/calcs"
import { formatMoney, formatPercent, formatDateTime } from "@/lib/format"
import { Disclaimer } from "@/components/disclaimer"
import { ImportForm } from "./import-form"
import { HoldingsTable } from "./holdings-table"
import { ThemeAllocation } from "./theme-allocation"

export const metadata = { title: "Portefeuille — Liquidity Lens" }

/**
 * Taux FX placeholder. Source FRED branchée en Phase 2.
 * Visible dans l'UI avec mention « approximatif ».
 */
const FX_RATES: FxRates = { USDCAD: 1.37, EURCAD: 1.46 }

export default async function PortefeuillePage() {
  const { holdings, themes, baseCurrency, lastImportedAt } = await fetchPortfolio()

  if (holdings.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
            Phase 1 — Portefeuille
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Importe ton premier portefeuille
          </h1>
          <p className="mt-2 text-muted">
            Glisse-dépose ton export Questrade au format CSV. Multiple comptes
            et multi-devises supportés ; les positions zombies (perte ≈ -100 %)
            sont automatiquement repérées.
          </p>
        </header>
        <ImportForm />
        <Disclaimer variant="inline" />
      </div>
    )
  }

  const holdingValues: HoldingValue[] = holdings.map((h) => ({
    symbol: h.symbol,
    marketValue: h.market_value,
    bookValue: h.book_value,
    unrealizedPnl: h.unrealized_pnl,
    currency: h.currency,
    themeId: h.theme_id,
    themeName: h.theme_name,
  }))

  const totals = computeTotals(holdingValues, baseCurrency, FX_RATES)
  const { items } = withWeights(holdingValues, baseCurrency, FX_RATES)
  const allocations = allocationByTheme(holdingValues, baseCurrency, FX_RATES)

  // Index par symbole pour merger weight + holding row
  const weightBySymbol = new Map(items.map((it) => [it.symbol, it.weight]))
  const rowsWithWeight = holdings.map((h) => ({
    ...h,
    weight: weightBySymbol.get(h.symbol) ?? null,
  }))

  const fxNote =
    baseCurrency !== "CAD" || holdings.some((h) => h.currency !== "CAD")
      ? `FX approximatif (USDCAD=${FX_RATES.USDCAD}). Rafraîchissement automatique en phase 2.`
      : null

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
            Portefeuille
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {holdings.length} positions
            <span className="text-muted ml-3 text-base font-normal">
              · {new Set(holdings.map((h) => h.account_external_id)).size} compte(s)
              · {[...new Set(holdings.map((h) => h.currency))].join(" / ")}
            </span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted">
            Dernier import
          </p>
          <p className="text-sm text-muted-strong">
            {formatDateTime(lastImportedAt)}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryTile
          label={`Valeur (${baseCurrency})`}
          primary={formatMoney(totals.totalMarketValue, baseCurrency)}
          secondary={`Coût : ${formatMoney(totals.totalBookValue, baseCurrency)}`}
        />
        <SummaryTile
          label="G/P non réalisé"
          primary={formatMoney(totals.totalUnrealizedPnl, baseCurrency)}
          secondary={formatPercent(totals.totalUnrealizedPnlPct)}
          tone={
            totals.totalUnrealizedPnl > 0
              ? "gain"
              : totals.totalUnrealizedPnl < 0
                ? "loss"
                : "neutral"
          }
        />
        <SummaryTile
          label="Positions zombies"
          primary={String(holdings.filter((h) => h.is_zombie).length)}
          secondary="G/P ≈ -100 %"
        />
        <SummaryTile
          label="Thèmes utilisés"
          primary={String(allocations.length)}
          secondary={`${holdings.filter((h) => !h.theme_id).length} sans thème`}
        />
      </section>

      {fxNote && (
        <p className="text-[11px] text-muted border-l-2 border-border-strong pl-3">
          ⚠ {fxNote}
        </p>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HoldingsTable rows={rowsWithWeight} themes={themes} />
        </div>
        <div className="space-y-6">
          <ThemeAllocation allocations={allocations} currency={baseCurrency} />
          <ImportForm />
        </div>
      </section>

      <Disclaimer variant="inline" />
    </div>
  )
}

function SummaryTile({
  label,
  primary,
  secondary,
  tone = "neutral",
}: {
  label: string
  primary: string
  secondary?: string
  tone?: "neutral" | "gain" | "loss"
}) {
  const toneCls =
    tone === "gain"
      ? "text-gain"
      : tone === "loss"
        ? "text-loss"
        : "text-foreground"
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-5">
      <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <p className={`mt-3 font-mono tabular-nums text-2xl ${toneCls}`}>
        {primary}
      </p>
      {secondary && <p className="mt-1 text-xs text-muted-strong">{secondary}</p>}
    </div>
  )
}

