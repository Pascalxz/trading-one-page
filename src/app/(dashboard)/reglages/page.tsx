import { fetchAlerts } from "@/server/alerts/queries"
import { Disclaimer } from "@/components/disclaimer"
import { AlertForm } from "./alert-form"
import { AlertList } from "./alert-list"

export const metadata = { title: "Réglages — Liquidity Lens" }

export default async function ReglagesPage() {
  const alerts = await fetchAlerts()

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          Réglages
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Alertes</h1>
        <p className="mt-2 text-muted">
          Règles déterministes sur ton portefeuille et le calendrier macro. Les
          déclenchements sont enrichis automatiquement par l&apos;IA (contexte
          factuel — aucune recommandation). Vérifié toutes les 4 h.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
          Tes alertes ({alerts.length})
        </h2>
        <AlertList alerts={alerts} />
      </section>

      <AlertForm />

      <Disclaimer variant="inline" />
    </div>
  )
}
