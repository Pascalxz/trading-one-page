/**
 * Cron endpoint : génère le briefing quotidien pour tous les utilisateurs
 * actifs (au moins une position).
 *
 * Configuré dans vercel.json : 1×/jour à 11:00 UTC (= 06:00 ET, café du matin).
 */

import { NextResponse } from "next/server"
import { generateBriefingsAll } from "@/server/ai/briefing"
import { optionalEnv } from "@/lib/env"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function GET(request: Request) {
  const cronSecret = optionalEnv("CRON_SECRET")
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const results = await generateBriefingsAll()
    const ok = results.filter((r) => r.generated).length
    const skipped = results.filter((r) => !r.generated).length
    return NextResponse.json({
      ok: true,
      total: results.length,
      generated: ok,
      skipped,
      results: results.map((r) => ({
        user_id: r.user_id.slice(0, 8) + "…",
        date: r.date,
        generated: r.generated,
        skipped_reason: r.skipped_reason,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 },
    )
  }
}
