import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Construit un snapshot JSON compact du contexte d'un utilisateur :
 * portefeuille (positions agrégées + thèmes + totaux), macro récente (dernier
 * point de chaque série + YoY), dev (latest metrics par protocole), prochains
 * catalyseurs. Injecté en `messages` (variable) — pas dans le system prompt
 * (qui reste cacheable).
 */

export type Snapshot = {
  generated_at: string
  base_currency: string
  portfolio: {
    total_market_value: number
    total_book_value: number
    total_unrealized_pnl: number
    total_unrealized_pnl_pct: number | null
    zombie_count: number
    by_theme: { theme: string; market_value: number; weight_pct: number; count: number }[]
    top_positions: {
      symbol: string
      description: string | null
      theme: string | null
      market_value: number
      currency: string
      weight_pct: number | null
      unrealized_pnl: number | null
      unrealized_pnl_pct: number | null
      day_change_pct: number | null
    }[]
    last_imported_at: string | null
  } | null
  macro: {
    series: {
      key: string
      label: string
      unit: string | null
      latest_value: number | null
      latest_date: string | null
      yoy_pct: number | null
    }[]
  }
  dev: {
    protocols: {
      symbol: string
      repo: string
      commits_7d: number | null
      commits_30d: number | null
      contributors_30d: number | null
      stars: number | null
      last_release_tag: string | null
      last_release_at: string | null
      observed_on: string | null
    }[]
  }
  upcoming_events: { kind: string; title: string; scheduled_at: string; days_until: number }[]
}

const FX_RATES: Record<string, number> = { USDCAD: 1.37, EURCAD: 1.46 }

function convertToBase(amount: number | null, from: string, to: string): number {
  if (amount === null) return 0
  if (from === to) return amount
  const direct = FX_RATES[`${from}${to}`]
  if (direct) return amount * direct
  const inverse = FX_RATES[`${to}${from}`]
  if (inverse) return amount / inverse
  return amount
}

export async function buildSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Snapshot> {
  const [
    { data: profile },
    { data: holdings },
    { data: themes },
    { data: macroSeries },
    { data: macroPoints },
    { data: instruments },
    { data: devMetrics },
    { data: events },
  ] = await Promise.all([
    supabase.from("profiles").select("base_currency").eq("id", userId).maybeSingle(),
    supabase
      .from("holdings")
      .select(
        `symbol, description, quantity, market_value, currency, theme_id, is_zombie,
         book_value, unrealized_pnl, unrealized_pnl_pct, day_change_pct`,
      )
      .eq("user_id", userId),
    supabase.from("themes").select("id, name").eq("user_id", userId),
    supabase.from("macro_series").select("id, key, label, unit").eq("source", "fred"),
    supabase
      .from("macro_points")
      .select("series_id, observed_at, value")
      .order("observed_at", { ascending: false })
      .limit(500),
    supabase
      .from("instruments")
      .select("id, symbol, github_repo, kind")
      .eq("kind", "crypto"),
    supabase
      .from("dev_metrics")
      .select(
        "instrument_id, observed_on, commits_7d, commits_30d, contributors_30d, stars, last_release_tag, last_release_at",
      )
      .order("observed_on", { ascending: false }),
    supabase
      .from("macro_events")
      .select("kind, title, scheduled_at")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
  ])

  const baseCurrency = profile?.base_currency ?? "CAD"
  const themeNameById = new Map((themes ?? []).map((t) => [t.id, t.name]))

  // === Portfolio
  let portfolio: Snapshot["portfolio"] = null
  if (holdings && holdings.length > 0) {
    let totalMV = 0
    let totalBV = 0
    let totalPNL = 0
    let zombieCount = 0
    const byThemeAgg = new Map<string, { name: string; value: number; count: number }>()

    const enriched = holdings.map((h) => {
      const mvBase = convertToBase(Number(h.market_value) || 0, h.currency ?? "CAD", baseCurrency)
      const bvBase = convertToBase(Number(h.book_value) || 0, h.currency ?? "CAD", baseCurrency)
      const pnlBase = convertToBase(Number(h.unrealized_pnl) || 0, h.currency ?? "CAD", baseCurrency)
      totalMV += mvBase
      totalBV += bvBase
      totalPNL += pnlBase
      if (h.is_zombie) zombieCount += 1
      const themeName = h.theme_id ? themeNameById.get(h.theme_id) ?? "Autre" : "Sans thème"
      const agg = byThemeAgg.get(themeName) ?? { name: themeName, value: 0, count: 0 }
      agg.value += mvBase
      agg.count += 1
      byThemeAgg.set(themeName, agg)
      return { holding: h, mvBase, pnlBase }
    })

    const byTheme = Array.from(byThemeAgg.values())
      .map((t) => ({
        theme: t.name,
        market_value: round(t.value),
        weight_pct: totalMV > 0 ? round((t.value / totalMV) * 100, 2) : 0,
        count: t.count,
      }))
      .sort((a, b) => b.market_value - a.market_value)

    const top = enriched
      .filter((e) => !e.holding.is_zombie)
      .sort((a, b) => b.mvBase - a.mvBase)
      .slice(0, 12)
      .map((e) => ({
        symbol: e.holding.symbol,
        description: e.holding.description,
        theme: e.holding.theme_id ? themeNameById.get(e.holding.theme_id) ?? null : null,
        market_value: Number(e.holding.market_value) || 0,
        currency: e.holding.currency ?? baseCurrency,
        weight_pct: totalMV > 0 ? round((e.mvBase / totalMV) * 100, 2) : null,
        unrealized_pnl: numOrNull(e.holding.unrealized_pnl),
        unrealized_pnl_pct: numOrNull(e.holding.unrealized_pnl_pct),
        day_change_pct: numOrNull(e.holding.day_change_pct),
      }))

    portfolio = {
      total_market_value: round(totalMV),
      total_book_value: round(totalBV),
      total_unrealized_pnl: round(totalPNL),
      total_unrealized_pnl_pct: totalBV > 0 ? round((totalPNL / totalBV) * 100, 2) : null,
      zombie_count: zombieCount,
      by_theme: byTheme,
      top_positions: top,
      last_imported_at: null,
    }
  }

  // === Macro
  const pointsBySeries = new Map<string, { observed_at: string; value: number }[]>()
  for (const p of macroPoints ?? []) {
    const arr = pointsBySeries.get(p.series_id) ?? []
    arr.push({ observed_at: p.observed_at, value: Number(p.value) })
    pointsBySeries.set(p.series_id, arr)
  }

  const macroOut = (macroSeries ?? []).map((s) => {
    const pts = pointsBySeries.get(s.id) ?? []
    const latest = pts[0] ?? null
    let yoy: number | null = null
    if (latest) {
      const target = new Date(latest.observed_at)
      target.setUTCFullYear(target.getUTCFullYear() - 1)
      const month = target.toISOString().slice(0, 7)
      const prior = pts.find((p) => p.observed_at.startsWith(month))
      if (prior && prior.value !== 0) yoy = round(((latest.value - prior.value) / prior.value) * 100, 2)
    }
    return {
      key: s.key,
      label: s.label,
      unit: s.unit,
      latest_value: latest ? round(latest.value) : null,
      latest_date: latest?.observed_at ?? null,
      yoy_pct: yoy,
    }
  })

  // === Dev metrics : dernière obs par instrument
  const latestDev = new Map<string, NonNullable<typeof devMetrics>[number]>()
  for (const row of devMetrics ?? []) {
    if (!latestDev.has(row.instrument_id)) latestDev.set(row.instrument_id, row)
  }
  const protocols = (instruments ?? []).map((inst) => {
    const d = latestDev.get(inst.id)
    return {
      symbol: inst.symbol,
      repo: inst.github_repo ?? "",
      commits_7d: d?.commits_7d ?? null,
      commits_30d: d?.commits_30d ?? null,
      contributors_30d: d?.contributors_30d ?? null,
      stars: d?.stars ?? null,
      last_release_tag: d?.last_release_tag ?? null,
      last_release_at: d?.last_release_at ?? null,
      observed_on: d?.observed_on ?? null,
    }
  })

  // === Upcoming events
  const upcoming = (events ?? []).map((e) => ({
    kind: e.kind,
    title: e.title,
    scheduled_at: e.scheduled_at,
    days_until: Math.max(
      0,
      Math.ceil((new Date(e.scheduled_at).getTime() - Date.now()) / 86_400_000),
    ),
  }))

  return {
    generated_at: new Date().toISOString(),
    base_currency: baseCurrency,
    portfolio,
    macro: { series: macroOut },
    dev: { protocols },
    upcoming_events: upcoming,
  }
}

function round(n: number, decimals = 2): number {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}
function numOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined) return null
  return typeof v === "number" ? v : Number(v)
}
