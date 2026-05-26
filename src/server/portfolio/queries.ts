import "server-only"
import { createClient } from "@/lib/supabase/server"

export type HoldingRow = {
  id: string
  account_id: string
  account_label: string | null
  account_external_id: string
  symbol: string
  description: string | null
  quantity: number
  avg_cost: number | null
  book_value: number | null
  market_price: number | null
  market_value: number | null
  day_change_pct: number | null
  unrealized_pnl: number | null
  unrealized_pnl_pct: number | null
  currency: string
  is_zombie: boolean
  theme_id: string | null
  theme_name: string | null
  theme_color: string | null
  imported_at: string | null
}

export type ThemeOption = {
  id: string
  slug: string
  name: string
  color: string
}

export type PortfolioData = {
  holdings: HoldingRow[]
  themes: ThemeOption[]
  baseCurrency: string
  lastImportedAt: string | null
}

/**
 * Récupère les positions de l'utilisateur courant avec le thème joint.
 * Retourne aussi la liste des thèmes pour la classification UI.
 */
export async function fetchPortfolio(): Promise<PortfolioData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { holdings: [], themes: [], baseCurrency: "CAD", lastImportedAt: null }
  }

  const [{ data: profile }, { data: holdings }, { data: themes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("base_currency")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("holdings")
      .select(
        `id, account_id, symbol, description, quantity, avg_cost, book_value,
         market_price, market_value, day_change_pct, unrealized_pnl,
         unrealized_pnl_pct, currency, is_zombie, theme_id, imported_at,
         accounts:account_id(label, external_id),
         themes:theme_id(name, color)`,
      )
      .order("market_value", { ascending: false, nullsFirst: false }),
    supabase
      .from("themes")
      .select("id, slug, name, color")
      .order("sort_order", { ascending: true }),
  ])

  const rows: HoldingRow[] = (holdings ?? []).map((h) => {
    const acc = h.accounts as { label: string | null; external_id: string } | null
    const th = h.themes as { name: string; color: string } | null
    return {
      id: h.id,
      account_id: h.account_id,
      account_label: acc?.label ?? null,
      account_external_id: acc?.external_id ?? "",
      symbol: h.symbol,
      description: h.description,
      quantity: Number(h.quantity),
      avg_cost: numOrNull(h.avg_cost),
      book_value: numOrNull(h.book_value),
      market_price: numOrNull(h.market_price),
      market_value: numOrNull(h.market_value),
      day_change_pct: numOrNull(h.day_change_pct),
      unrealized_pnl: numOrNull(h.unrealized_pnl),
      unrealized_pnl_pct: numOrNull(h.unrealized_pnl_pct),
      currency: h.currency ?? "CAD",
      is_zombie: h.is_zombie,
      theme_id: h.theme_id,
      theme_name: th?.name ?? null,
      theme_color: th?.color ?? null,
      imported_at: h.imported_at,
    }
  })

  const lastImportedAt = rows.reduce<string | null>((acc, r) => {
    if (!r.imported_at) return acc
    return acc === null || r.imported_at > acc ? r.imported_at : acc
  }, null)

  return {
    holdings: rows,
    themes: themes ?? [],
    baseCurrency: profile?.base_currency ?? "CAD",
    lastImportedAt,
  }
}

function numOrNull(v: string | number | null): number | null {
  if (v === null || v === undefined) return null
  return typeof v === "number" ? v : Number(v)
}
