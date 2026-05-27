import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { SignupForm } from "./signup-form"

export async function generateMetadata() {
  const t = await getTranslations("auth")
  return { title: `${t("signUpTitle")} — Liquidity Lens` }
}

export default async function SignupPage() {
  const t = await getTranslations("auth")
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{t("signUpTitle")}</h1>
      <p className="text-sm text-muted mb-8">{t("signUpSubtitle")}</p>
      <SignupForm />
      <p className="text-sm text-muted mt-6">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-accent hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  )
}
