/**
 * Helpers pour lire les variables d'environnement avec messages d'erreur clairs
 * (évite les 500 silencieux quand une env var manque en production).
 */

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === "") {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        `Voir .env.example pour la liste complète. ` +
        `Sur Vercel : Project Settings → Environment Variables.`,
    )
  }
  return value
}

export function optionalEnv(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() !== "" ? v : undefined
}

/** Récupère les credentials Supabase publics — usage browser + server + proxy. */
export function getSupabasePublicEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  }
}
