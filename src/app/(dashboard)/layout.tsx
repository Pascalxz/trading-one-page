import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Brand } from "@/components/brand"
import { Disclaimer } from "@/components/disclaimer"
import { SignOutButton } from "./signout-button"

const NAV = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/portefeuille", label: "Portefeuille" },
  { href: "/macro", label: "Macro" },
  { href: "/projets", label: "Projets" },
  { href: "/analyse", label: "Analyse" },
  { href: "/reglages", label: "Réglages" },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, base_currency")
    .eq("id", user.id)
    .maybeSingle()

  const label = profile?.display_name ?? user.email ?? ""

  return (
    <>
      <header className="border-b border-border bg-surface/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <Link href="/dashboard">
              <Brand size="sm" />
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-muted-strong hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              {profile?.base_currency ?? "CAD"}
            </span>
            <span className="text-sm text-muted-strong">{label}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Disclaimer />
    </>
  )
}
