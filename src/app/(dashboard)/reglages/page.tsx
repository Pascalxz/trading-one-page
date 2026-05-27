import { getTranslations } from "next-intl/server"
import { fetchAlerts } from "@/server/alerts/queries"
import { fetchAiUsage } from "@/server/ai/usage-queries"
import { Disclaimer } from "@/components/disclaimer"
import { AlertForm } from "./alert-form"
import { AlertList } from "./alert-list"
import { AiUsageCard } from "./ai-usage-card"

export async function generateMetadata() {
  const t = await getTranslations("settings")
  return { title: `${t("kicker")} — Liquidity Lens` }
}

export default async function ReglagesPage() {
  const t = await getTranslations("settings")
  const [alerts, usage] = await Promise.all([fetchAlerts(), fetchAiUsage()])

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          {t("kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
          {t("alertsTitle", { count: alerts.length })}
        </h2>
        <p className="text-sm text-muted">{t("alertsSubtitle")}</p>
        <AlertList alerts={alerts} />
        <AlertForm />
      </section>

      <AiUsageCard usage={usage} />

      <Disclaimer variant="inline" />
    </div>
  )
}
