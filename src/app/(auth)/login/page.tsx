import Link from "next/link"
import { LoginForm } from "./login-form"

export const metadata = { title: "Connexion — Liquidity Lens" }

type SearchParams = Promise<{ redirect?: string }>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { redirect } = await searchParams
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Connexion</h1>
      <p className="text-sm text-muted mb-8">
        Accède à ton tableau de bord.
      </p>
      <LoginForm redirectTo={redirect ?? "/dashboard"} />
      <p className="text-sm text-muted mt-6">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
