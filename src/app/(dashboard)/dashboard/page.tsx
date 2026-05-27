import { createClient } from "@/lib/supabase/server"
import { Disclaimer } from "@/components/disclaimer"
import { BriefingCard } from "./briefing-card"

export const metadata = { title: "Accueil — Liquidity Lens" }

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: holdingsCount },
    { count: alertsCount },
    { data: themes },
    { data: briefing },
  ] = await Promise.all([
    supabase.from("holdings").select("*", { count: "exact", head: true }),
    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("themes")
      .select("slug, name, color")
      .order("sort_order", { ascending: true }),
    supabase
      .from("briefings")
      .select("content, for_date")
      .eq("for_date", today)
      .maybeSingle(),
  ])

  const hasHoldings = (holdingsCount ?? 0) > 0

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          Accueil
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {user?.email ? `${user.email.split("@")[0]},` : ""} voici le tableau
          de bord.
        </h1>
        <p className="mt-2 text-muted">
          Portefeuille consolidé, macro suivie, projets crypto en regard, et un
          briefing IA quotidien.
        </p>
      </header>

      <BriefingCard
        initialContent={briefing?.content ?? null}
        initialDate={briefing?.for_date ?? null}
        hasHoldings={hasHoldings}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile label="Positions" value={holdingsCount ?? 0} hint="Onglet Portefeuille" />
        <Tile label="Alertes actives" value={alertsCount ?? 0} hint="Phase 4 IA — bientôt" />
        <Tile label="Thèmes" value={themes?.length ?? 0} hint="Personnalisables" />
      </section>

      {themes && themes.length > 0 && (
        <section className="rounded-lg border border-border bg-surface/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-4">
            Thèmes de classification
          </h2>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <span
                key={t.slug}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-2 px-3 py-1 text-xs"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-muted-strong">{t.name}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <Disclaimer variant="inline" />
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-5">
      <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <p className="mt-3 font-mono text-3xl tabular-nums text-foreground">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  )
}
