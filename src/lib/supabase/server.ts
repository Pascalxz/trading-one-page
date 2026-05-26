import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"
import { getSupabasePublicEnv } from "@/lib/env"

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabasePublicEnv()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Appelé depuis un Server Component : Next interdit le set ici.
          // Le proxy s'en charge à chaque requête.
        }
      },
    },
  })
}
