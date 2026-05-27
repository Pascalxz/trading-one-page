/**
 * Cron endpoint : rafraîchit l'activité dev GitHub des protocoles suivis.
 *
 * Configuré dans vercel.json : 1×/jour à 06:30 UTC (décalé de 30 min après
 * le cron macro pour éviter les pics simultanés).
 */

import { NextResponse } from "next/server"
import { refreshDevMetrics } from "@/server/agents/dev"
import { optionalEnv } from "@/lib/env"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const cronSecret = optionalEnv("CRON_SECRET")
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await refreshDevMetrics()
    return NextResponse.json(result, { status: result.ok ? 200 : 207 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
