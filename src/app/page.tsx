import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Brand } from "@/components/brand"
import { Disclaimer } from "@/components/disclaimer"

export default async function Home() {
  const t = await getTranslations("landing")
  const tAuth = await getTranslations("auth")

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
              {tAuth("signIn")}
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-accent/40 bg-accent-soft px-3 py-1.5 text-accent hover:bg-accent/20 transition-colors"
            >
              {tAuth("signUp")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-6">
            {t("version")}
          </p>
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.05] mb-6">
            {t("headlineMain")}{" "}
            <span className="text-muted-strong">{t("headlineSub")}</span>
          </h1>
          <p className="text-lg text-muted-strong leading-relaxed mb-10">
            {t("lead")}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-[#1a1206] hover:brightness-110 transition"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border-strong px-5 py-2.5 text-sm text-muted-strong hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              {t("ctaSecondary")}
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
