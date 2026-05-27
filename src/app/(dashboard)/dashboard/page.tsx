import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase/server"
import { Disclaimer } from "@/components/disclaimer"
import { fetchRecentAlertEvents } from "@/server/alerts/queries"
import { BriefingCard } from "./briefing-card"
import { AlertsCard } from "./alerts-card"

export async function generateMetadata() {
  const t = await getTranslations("dashboard")
  return { title: `${t("kicker")} — Liquidity Lens` }
}

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().slice(0, 10)
  const t = await getTranslations("dashboard")

  const [
    { count: holdingsCount },
    { count: alertsCount },
    { data: themes },
    { data: briefing },
    alertEvents,
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
    fetchRecentAlertEvents(20),
  ])

  const hasHoldings = (holdingsCount ?? 0) > 0
  const name = user?.email ? user.email.split("@")[0] : null

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          {t("kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {name ? t("welcome", { name }) : t("welcomeAnon")}
        </h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>

      <BriefingCard
        initialContent={briefing?.content ?? null}
        initialDate={briefing?.for_date ?? null}
        hasHoldings={hasHoldings}
      />

      <AlertsCard events={alertEvents} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile label={t("tilePositions")} value={holdingsCount ?? 0} hint={t("tilePositionsHint")} />
        <Tile label={t("tileAlertsActive")} value={alertsCount ?? 0} hint={t("tileAlertsHint")} />
        <Tile label={t("tileThemes")} value={themes?.length ?? 0} hint={t("tileThemesHint")} />
      </section>

      {themes && themes.length > 0 && (
        <section className="rounded-lg border border-border bg-surface/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted mb-4">
            {t("themesTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {themes.map((th) => (
              <span
                key={th.slug}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-2 px-3 py-1 text-xs"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: th.color }}
                />
                <span className="text-muted-strong">{th.name}</span>
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
