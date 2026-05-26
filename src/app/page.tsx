import Link from "next/link"
import { Brand } from "@/components/brand"
import { Disclaimer } from "@/components/disclaimer"

export default function Home() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Brand size="md" />
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="text-muted-strong hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-accent/40 bg-accent-soft px-3 py-1.5 text-accent hover:bg-accent/20 transition-colors"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-6">
            V1 — Draft
          </p>
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.05] mb-6">
            Relier la liquidité macro, la santé des projets et tes positions réelles —{" "}
            <span className="text-muted-strong">en un seul regard.</span>
          </h1>
          <p className="text-lg text-muted-strong leading-relaxed mb-10">
            Liquidity Lens consolide ton portefeuille multi-comptes,
            l&apos;environnement macroéconomique (M2, CPI, taux Fed) et
            l&apos;activité de développement des protocoles crypto que tu détiens.
            Quatre couches d&apos;IA — briefing quotidien, alertes contextuelles,
            analyse à la demande, agents autonomes — au lieu de jongler entre cinq
            écrans.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-[#1a1206] hover:brightness-110 transition"
            >
              Commencer
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border-strong px-5 py-2.5 text-sm text-muted-strong hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <div className="mt-16">
            <Disclaimer variant="inline" />
          </div>
        </section>
      </main>

      <Disclaimer />
    </>
  )
}
