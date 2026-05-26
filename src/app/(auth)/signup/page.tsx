import Link from "next/link"
import { SignupForm } from "./signup-form"

export const metadata = { title: "Créer un compte — Liquidity Lens" }

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Créer un compte
      </h1>
      <p className="text-sm text-muted mb-8">
        Un dashboard, trois piliers, quatre modes IA.
      </p>
      <SignupForm />
      <p className="text-sm text-muted mt-6">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Connexion
        </Link>
      </p>
    </div>
  )
}
