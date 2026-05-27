import "server-only"
import { createClient } from "@/lib/supabase/server"

export type AiUsage = {
  today: ModeUsage
  week: ModeUsage
  thirtyDays: ModeUsage
  budget: { used_today: number; budget_today: number; remaining_today: number }
  byMode: { mode: string; runs: number; tokens_in: number; tokens_out: number; cost_usd: number }[]
  daily: { date: string; tokens: number; cost_usd: number; runs: number }[]
}

type ModeUsage = {
  runs: number
  tokens_in: number
  tokens_out: number
  cost_usd: number
}

function emptyMode(): ModeUsage {
  return { runs: 0, tokens_in: 0, tokens_out: 0, cost_usd: 0 }
}

export async function fetchAiUsage(): Promise<AiUsage> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return emptyUsage()
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - 7)
  const thirtyStart = new Date(todayStart)
  thirtyStart.setUTCDate(thirtyStart.getUTCDate() - 29)

  const [{ data: runs }, { data: profile }] = await Promise.all([
    supabase
      .from("ai_runs")
      .select("mode, tokens_in, tokens_out, cost_usd, created_at, status")
      .gte("created_at", thirtyStart.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("ai_token_budget")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  const today = emptyMode()
  const week = emptyMode()
  const thirtyDays = emptyMode()
  const byModeMap = new Map<string, ModeUsage>()
  const dailyMap = new Map<string, { tokens: number; cost_usd: number; runs: number }>()

  for (const r of runs ?? []) {
    if (r.status === "error") continue
    const ts = new Date(r.created_at)
    const tokensIn = r.tokens_in ?? 0
    const tokensOut = r.tokens_out ?? 0
    const cost = Number(r.cost_usd ?? 0)

    accumulate(thirtyDays, tokensIn, tokensOut, cost)
    if (ts >= weekStart) accumulate(week, tokensIn, tokensOut, cost)
    if (ts >= todayStart) accumulate(today, tokensIn, tokensOut, cost)

    const m = byModeMap.get(r.mode) ?? emptyMode()
    accumulate(m, tokensIn, tokensOut, cost)
    byModeMap.set(r.mode, m)

    const dayKey = ts.toISOString().slice(0, 10)
    const day = dailyMap.get(dayKey) ?? { tokens: 0, cost_usd: 0, runs: 0 }
    day.tokens += tokensIn + tokensOut
    day.cost_usd += cost
    day.runs += 1
    dailyMap.set(dayKey, day)
  }

  // Garantit 30 jours consécutifs même si zéro
  const daily: AiUsage["daily"] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    const v = dailyMap.get(key) ?? { tokens: 0, cost_usd: 0, runs: 0 }
    daily.push({ date: key, ...v })
  }

  const byMode = Array.from(byModeMap.entries())
    .map(([mode, m]) => ({
      mode,
      runs: m.runs,
      tokens_in: m.tokens_in,
      tokens_out: m.tokens_out,
      cost_usd: m.cost_usd,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd)

  const budgetToday = profile?.ai_token_budget ?? 200_000
  const usedToday = today.tokens_in + today.tokens_out

  return {
    today,
    week,
    thirtyDays,
    byMode,
    daily,
    budget: {
      used_today: usedToday,
      budget_today: budgetToday,
      remaining_today: Math.max(0, budgetToday - usedToday),
    },
  }
}

function accumulate(target: ModeUsage, tIn: number, tOut: number, cost: number) {
  target.runs += 1
  target.tokens_in += tIn
  target.tokens_out += tOut
  target.cost_usd += cost
}

function emptyUsage(): AiUsage {
  return {
    today: emptyMode(),
    week: emptyMode(),
    thirtyDays: emptyMode(),
    byMode: [],
    daily: [],
    budget: { used_today: 0, budget_today: 200_000, remaining_today: 200_000 },
  }
}
