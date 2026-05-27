import "server-only"

import { runCompletion, getServiceClient } from "@/lib/ai/client"
import { buildSnapshot } from "@/lib/ai/context"
import { BRIEFING_SYSTEM, BRIEFING_PROMPT_VERSION } from "@/lib/ai/prompts/briefing"

export type BriefingResult = {
  user_id: string
  date: string
  generated: boolean
  content?: string
  skipped_reason?: string
}

/**
 * Génère (et stocke) le briefing du jour pour un utilisateur.
 * Idempotent : si un briefing existe déjà pour aujourd'hui, retourne sans
 * regénérer (sauf si `force=true`).
 */
export async function generateBriefingForUser(
  userId: string,
  options: { force?: boolean } = {},
): Promise<BriefingResult> {
  const supabase = getServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  if (!options.force) {
    const { data: existing } = await supabase
      .from("briefings")
      .select("id")
      .eq("user_id", userId)
      .eq("for_date", today)
      .maybeSingle()
    if (existing) {
      return { user_id: userId, date: today, generated: false, skipped_reason: "already_exists" }
    }
  }

  const snapshot = await buildSnapshot(supabase, userId)

  if (!snapshot.portfolio) {
    return {
      user_id: userId,
      date: today,
      generated: false,
      skipped_reason: "empty_portfolio",
    }
  }

  const userMessage =
    `Voici le snapshot du jour (JSON). Rédige le briefing quotidien selon le format demandé.\n\n` +
    "```json\n" +
    JSON.stringify(snapshot, null, 2) +
    "\n```"

  const result = await runCompletion({
    userId,
    mode: "briefing",
    system: BRIEFING_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 700,
    metadata: { prompt_version: BRIEFING_PROMPT_VERSION, snapshot_date: today },
  })

  await supabase.from("briefings").upsert(
    {
      user_id: userId,
      for_date: today,
      content: result.text,
      model: result.model,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      cost_usd: result.costUsd,
    },
    { onConflict: "user_id,for_date" },
  )

  return { user_id: userId, date: today, generated: true, content: result.text }
}

/**
 * Génère le briefing pour tous les utilisateurs qui ont au moins un holding.
 * Appelé par le cron quotidien.
 */
export async function generateBriefingsAll(): Promise<BriefingResult[]> {
  const supabase = getServiceClient()

  // Récupère la liste des user_ids qui ont au moins une position
  const { data, error } = await supabase
    .from("holdings")
    .select("user_id")
    .limit(10_000)

  if (error || !data) {
    throw new Error(`Lecture des holdings : ${error?.message ?? "vide"}`)
  }

  const userIds = Array.from(new Set(data.map((h) => h.user_id)))
  const results: BriefingResult[] = []
  for (const uid of userIds) {
    try {
      results.push(await generateBriefingForUser(uid))
    } catch (e) {
      results.push({
        user_id: uid,
        date: new Date().toISOString().slice(0, 10),
        generated: false,
        skipped_reason: e instanceof Error ? e.message : "error",
      })
    }
  }
  return results
}
