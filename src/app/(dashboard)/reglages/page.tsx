import { fetchAlerts } from "@/server/alerts/queries"
import { fetchAiUsage } from "@/server/ai/usage-queries"
import { Disclaimer } from "@/components/disclaimer"
import { AlertForm } from "./alert-form"
import { AlertList } from "./alert-list"
import { AiUsageCard } from "./ai-usage-card"

export const metadata = { title: "Réglages — Liquidity Lens" }

export default async function ReglagesPage() {
  const [alerts, usage] = await Promise.all([fetchAlerts(), fetchAiUsage()])

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          Réglages
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Alertes &amp; consommation IA
        </h1>
        <p className="mt-2 text-muted">
          Configure tes alertes contextuelles et surveille ce que l&apos;IA coûte.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
          Alertes ({alerts.length})
        </h2>
        <AlertList alerts={alerts} />
        <AlertForm />
      </section>

      <AiUsageCard usage={usage} />

      <Disclaimer variant="inline" />
    </div>
  )
}
