/**
 * Agent dev : pour chaque instrument avec un `github_repo`, récupère
 * commits 7j/30j, contributeurs 30j, dernière release et stars.
 * Idempotent (upsert sur (instrument_id, observed_on)).
 */

import { createClient as createServiceClient } from "@supabase/supabase-js"
import {
  fetchRepo,
  countRecentCommits,
  countActiveContributors,
  fetchLatestRelease,
} from "@/lib/sources/github"
import { requireEnv, optionalEnv } from "@/lib/env"
import type { Database } from "@/lib/types/database"

export type DevRefreshResult = {
  ok: boolean
  instruments: {
    symbol: string
    repo: string
    inserted: boolean
    commits7d?: number
    commits30d?: number
    contributors30d?: number
    stars?: number
    lastReleaseTag?: string | null
    error?: string
  }[]
  durationMs: number
}

function getServiceClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey =
    optionalEnv("SUPABASE_SERVICE_ROLE_KEY") ?? optionalEnv("SUPABASE_SECRET_KEY")
  if (!serviceKey) {
    throw new Error(
      "Variable manquante : SUPABASE_SERVICE_ROLE_KEY. Settings → API → service_role.",
    )
  }
  return createServiceClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function refreshDevMetrics(): Promise<DevRefreshResult> {
  const start = Date.now()
  const supabase = getServiceClient()

  const { data: instruments, error } = await supabase
    .from("instruments")
    .select("id, symbol, github_repo")
    .not("github_repo", "is", null)

  if (error || !instruments) {
    throw new Error(error?.message ?? "Aucun instrument à rafraîchir.")
  }

  const results: DevRefreshResult["instruments"] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const inst of instruments) {
    const repo = inst.github_repo!
    try {
      const [stats, commits7d, commits30d, contributors30d, release] = await Promise.all([
        fetchRepo(repo),
        countRecentCommits(repo, 7),
        countRecentCommits(repo, 30),
        countActiveContributors(repo, 30),
        fetchLatestRelease(repo),
      ])

      const { error: upsertErr } = await supabase.from("dev_metrics").upsert(
        {
          instrument_id: inst.id,
          observed_on: today,
          commits_7d: commits7d.count,
          commits_30d: commits30d.count,
          contributors_30d: contributors30d,
          stars: stats.stars,
          open_issues: stats.openIssues,
          last_release_at: release?.publishedAt ?? null,
          last_release_tag: release?.tag ?? null,
          metadata: {
            capped_7d: commits7d.capped,
            capped_30d: commits30d.capped,
            default_branch: stats.defaultBranch,
          },
        },
        { onConflict: "instrument_id,observed_on" },
      )
      if (upsertErr) throw new Error(upsertErr.message)

      results.push({
        symbol: inst.symbol,
        repo,
        inserted: true,
        commits7d: commits7d.count,
        commits30d: commits30d.count,
        contributors30d,
        stars: stats.stars,
        lastReleaseTag: release?.tag ?? null,
      })
    } catch (e) {
      results.push({
        symbol: inst.symbol,
        repo,
        inserted: false,
        error: e instanceof Error ? e.message : "Erreur inconnue",
      })
    }
  }

  return {
    ok: results.every((r) => r.inserted),
    instruments: results,
    durationMs: Date.now() - start,
  }
}
