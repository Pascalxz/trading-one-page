"use server"

import { runCompletion } from "@/lib/ai/client"
import { buildSnapshot } from "@/lib/ai/context"
import { ANALYSIS_SYSTEM, ANALYSIS_PROMPT_VERSION } from "@/lib/ai/prompts/analysis"
import { createClient } from "@/lib/supabase/server"

export type AnalysisState = {
  status: "idle" | "ok" | "error"
  question?: string
  answer?: string
  tokens?: { in: number; out: number }
  costUsd?: number
  durationMs?: number
  error?: string
}

export const analysisInitialState: AnalysisState = { status: "idle" }

export async function askAnalysisAction(
  _prev: AnalysisState,
  formData: FormData,
): Promise<AnalysisState> {
  const question = String(formData.get("question") ?? "").trim()
  if (!question) {
    return { status: "error", error: "Question vide." }
  }
  if (question.length > 2000) {
    return { status: "error", error: "Question trop longue (max 2000 caractères)." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: "error", error: "Non authentifié." }
  }

  try {
    const snapshot = await buildSnapshot(supabase, user.id)
    const userMessage =
      `Snapshot du portefeuille, macro et dev de l'utilisateur (JSON) :\n\n` +
      "```json\n" +
      JSON.stringify(snapshot, null, 2) +
      "\n```\n\n" +
      `Question : ${question}`

    const result = await runCompletion({
      userId: user.id,
      mode: "analysis",
      system: ANALYSIS_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1500,
      metadata: { prompt_version: ANALYSIS_PROMPT_VERSION },
    })

    return {
      status: "ok",
      question,
      answer: result.text,
      tokens: { in: result.tokensIn, out: result.tokensOut },
      costUsd: result.costUsd,
      durationMs: result.durationMs,
    }
  } catch (e) {
    return {
      status: "error",
      question,
      error: e instanceof Error ? e.message : "Erreur inconnue",
    }
  }
}
