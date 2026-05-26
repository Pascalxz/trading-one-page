/**
 * Cron endpoint : rafraîchit les séries macro depuis FRED.
 *
 * Authentification : Vercel Cron envoie `Authorization: Bearer <CRON_SECRET>`
 * pour les déclenchements automatiques. On accepte aussi les requêtes
 * sans Bearer si on est en preview/dev.
 *
 * Configuré dans vercel.json : 1×/jour à 06:00 UTC (séries mensuelles).
 */

import { NextResponse } from "next/server"
import { refreshMacroSeries } from "@/server/agents/macro"
import { optionalEnv } from "@/lib/env"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // FRED + upsert peuvent prendre du temps

export async function GET(request: Request) {
  const cronSecret = optionalEnv("CRON_SECRET")
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await refreshMacroSeries()
    return NextResponse.json(result, { status: result.ok ? 200 : 207 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
