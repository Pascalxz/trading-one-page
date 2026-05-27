import { Disclaimer } from "@/components/disclaimer"
import { AnalysisForm } from "./analysis-form"

export const metadata = { title: "Analyse — Liquidity Lens" }

export default function AnalysePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          Analyse
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Pose ta question à l&apos;IA
        </h1>
        <p className="mt-2 text-muted max-w-xl">
          L&apos;IA a accès au snapshot complet : tes positions, l&apos;environnement
          macro (M2, CPI, taux Fed), l&apos;activité dev des protocoles que tu suis,
          et le calendrier des catalyseurs. Elle ne donne aucune recommandation
          d&apos;achat ou de vente.
        </p>
      </header>

      <AnalysisForm />

      <Disclaimer variant="inline" />
    </div>
  )
}
