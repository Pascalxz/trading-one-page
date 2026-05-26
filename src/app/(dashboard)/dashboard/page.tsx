import { createClient } from "@/lib/supabase/server"
import { Disclaimer } from "@/components/disclaimer"

export const metadata = { title: "Accueil — Liquidity Lens" }

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: holdingsCount }, { count: alertsCount }, { data: themes }] =
    await Promise.all([
      supabase.from("holdings").select("*", { count: "exact", head: true }),
      supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("themes")
        .select("slug, name, color")
        .order("sort_order", { ascending: true }),
    ])

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          Phase 0 — Fondations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Bienvenue{user?.email ? `, ${user.email}` : ""}.
        </h1>
        <p className="mt-2 text-muted">
          Ton compte est créé et isolé par RLS. Les piliers Portefeuille / Macro /
          Projets et les modes IA arrivent dans les phases suivantes.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile label="Positions" value={holdingsCount ?? 0} hint="Phase 1 — import CSV" />
        <Tile label="Alertes actives" value={alertsCount ?? 0} hint="Phase 4 — IA" />
        <Tile label="Thèmes" value={themes?.length ?? 0} hint="Défauts seedés" />
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
