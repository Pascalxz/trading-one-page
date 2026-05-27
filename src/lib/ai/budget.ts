import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Calcule le total de tokens (in + out) consommé par l'utilisateur depuis 00:00 UTC.
 * Sert au plafond quotidien (PRD §6.4).
 */
export async function tokensUsedToday(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("ai_runs")
    .select("tokens_in, tokens_out")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())

  if (error || !data) return 0
  return data.reduce((sum, r) => sum + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0)
}

/**
 * Renvoie le budget quotidien configuré sur le profil (défaut 200 000).
 */
export async function getDailyBudget(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("ai_token_budget")
    .eq("id", userId)
    .maybeSingle()
  return data?.ai_token_budget ?? 200_000
}

export type BudgetCheck = {
  ok: boolean
  used: number
  budget: number
  remaining: number
}

export async function checkBudget(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<BudgetCheck> {
  const [used, budget] = await Promise.all([
    tokensUsedToday(supabase, userId),
    getDailyBudget(supabase, userId),
  ])
  return { ok: used < budget, used, budget, remaining: budget - used }
}
