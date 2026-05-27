import Link from "next/link"
import { Brand } from "@/components/brand"

export const metadata = { title: "404 — Liquidity Lens" }

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-5">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Brand size="md" />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-4">
            404
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">
            Page introuvable
          </h1>
          <p className="text-muted mb-8">
            L&apos;URL demandée n&apos;existe pas (ou n&apos;existe plus). Tu peux retourner
            à l&apos;accueil ou au tableau de bord.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-md border border-border-strong px-4 py-2 text-sm text-muted-strong hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              Accueil
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#1a1206] hover:brightness-110 transition"
            >
              Tableau de bord
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
