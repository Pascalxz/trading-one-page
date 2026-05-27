/**
 * Cron endpoint : scanne toutes les alertes actives et déclenche les
 * événements (avec enrichissement IA).
 *
 * vercel.json : toutes les 4h.
 */

import { NextResponse } from "next/server"
import { scanAllAlerts } from "@/server/alerts/evaluate"
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
    const result = await scanAllAlerts()
    return NextResponse.json(result, { status: result.ok ? 200 : 207 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 },
    )
  }
}
