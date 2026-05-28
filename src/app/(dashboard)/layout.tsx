import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase/server"
import { Brand } from "@/components/brand"
import { Disclaimer } from "@/components/disclaimer"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { SignOutButton } from "./signout-button"

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
  const t = await getTranslations("nav")
  const tCommon = await getTranslations("common")

  const NAV = [
    { href: "/dashboard", label: t("home") },
    { href: "/portefeuille", label: t("portfolio") },
    { href: "/macro", label: t("macro") },
    { href: "/projets", label: t("projects") },
    { href: "/analyse", label: t("analysis") },
    { href: "/reglages", label: t("settings") },
  ]

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[#1a1206]"
      >
        {tCommon("mainContent")}
      </a>
      <header className="border-b border-border bg-surface/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <Link href="/dashboard" aria-label={t("brandAria")}>
              <Brand size="sm" />
            </Link>
            <nav aria-label={t("primary")} className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-muted-strong hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted" aria-label={t("currencyAria")}>
              {profile?.base_currency ?? "CAD"}
            </span>
            <span className="text-sm text-muted-strong">{label}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1">{children}</main>
      <Disclaimer />
    </>
  )
}
