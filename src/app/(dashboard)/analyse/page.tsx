import { getTranslations } from "next-intl/server"
import { Disclaimer } from "@/components/disclaimer"
import { AnalysisForm } from "./analysis-form"

export async function generateMetadata() {
  const t = await getTranslations("analysis")
  return { title: `${t("kicker")} — Liquidity Lens` }
}

export default async function AnalysePage() {
  const t = await getTranslations("analysis")
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-2">
          {t("kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted max-w-xl">{t("intro")}</p>
      </header>

      <AnalysisForm />

      <Disclaimer variant="inline" />
    </div>
  )
}
