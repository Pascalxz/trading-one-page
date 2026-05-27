import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { LoginForm } from "./login-form"

export async function generateMetadata() {
  const t = await getTranslations("auth")
  return { title: `${t("signInTitle")} — Liquidity Lens` }
}

type SearchParams = Promise<{ redirect?: string }>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { redirect } = await searchParams
  const t = await getTranslations("auth")
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{t("signInTitle")}</h1>
      <p className="text-sm text-muted mb-8">{t("signInSubtitle")}</p>
      <LoginForm redirectTo={redirect ?? "/dashboard"} />
      <p className="text-sm text-muted mt-6">
        {t("noAccount")}{" "}
        <Link href="/signup" className="text-accent hover:underline">
          {t("signUp")}
        </Link>
      </p>
    </div>
  )
}
