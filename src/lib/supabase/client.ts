import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"
import { getSupabasePublicEnv } from "@/lib/env"

export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv()
  return createBrowserClient<Database>(url, publishableKey)
}
