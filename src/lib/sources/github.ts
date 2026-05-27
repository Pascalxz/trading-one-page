/**
 * Adaptateur GitHub API (REST v3).
 *
 * Sans token : 60 req/h. Avec GITHUB_TOKEN (PAT fine-grained, lecture publique) :
 * 5000 req/h.
 *
 * Docs : https://docs.github.com/en/rest
 */

import { optionalEnv } from "@/lib/env"

const BASE = "https://api.github.com"

function headers() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  const token = optionalEnv("GITHUB_TOKEN")
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export type RepoStats = {
  fullName: string
  stars: number
  openIssues: number
  defaultBranch: string
  pushedAt: string | null
  homepage: string | null
}

export async function fetchRepo(repo: string): Promise<RepoStats> {
  const res = await fetch(`${BASE}/repos/${repo}`, {
    headers: headers(),
    next: { revalidate: 1800 }, // 30 min
  })
  if (!res.ok) throw new Error(`GitHub repo ${repo} ${res.status}`)
  const data = (await res.json()) as {
    full_name: string
    stargazers_count: number
    open_issues_count: number
    default_branch: string
    pushed_at: string
    homepage: string | null
  }
  return {
    fullName: data.full_name,
    stars: data.stargazers_count,
    openIssues: data.open_issues_count,
    defaultBranch: data.default_branch,
    pushedAt: data.pushed_at,
    homepage: data.homepage,
  }
}

/**
 * Compte les commits sur les N derniers jours. Limite GitHub : pagination
 * max 100/page. Pour N=30 et un repo actif on peut dépasser → on prend les
 * 5 premières pages (500 commits max) puis on note "500+" si overflow.
 */
export async function countRecentCommits(
  repo: string,
  days: number,
): Promise<{ count: number; capped: boolean }> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  let total = 0
  let capped = false
  const MAX_PAGES = 5

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${BASE}/repos/${repo}/commits`)
    url.searchParams.set("since", since)
    url.searchParams.set("per_page", "100")
    url.searchParams.set("page", String(page))

    const res = await fetch(url, { headers: headers(), next: { revalidate: 1800 } })
    if (!res.ok) {
      if (res.status === 409) return { count: 0, capped: false } // repo vide
      throw new Error(`GitHub commits ${repo} ${res.status}`)
    }
    const commits = (await res.json()) as unknown[]
    total += commits.length
    if (commits.length < 100) break
    if (page === MAX_PAGES) capped = true
  }
  return { count: total, capped }
}

/**
 * Compte les contributeurs distincts sur les N derniers jours.
 * Utilise les commits pour extraire les auteurs uniques.
 */
export async function countActiveContributors(
  repo: string,
  days: number,
): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const authors = new Set<string>()
  const MAX_PAGES = 5

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${BASE}/repos/${repo}/commits`)
    url.searchParams.set("since", since)
    url.searchParams.set("per_page", "100")
    url.searchParams.set("page", String(page))

    const res = await fetch(url, { headers: headers(), next: { revalidate: 1800 } })
    if (!res.ok) {
      if (res.status === 409) return 0
      throw new Error(`GitHub commits/contributors ${repo} ${res.status}`)
    }
    const commits = (await res.json()) as {
      author: { login: string } | null
      commit: { author: { email: string } }
    }[]
    for (const c of commits) {
      const key = c.author?.login ?? c.commit?.author?.email ?? ""
      if (key) authors.add(key)
    }
    if (commits.length < 100) break
  }
  return authors.size
}

export type LatestRelease = {
  tag: string
  publishedAt: string
  url: string
}

export async function fetchLatestRelease(repo: string): Promise<LatestRelease | null> {
  const res = await fetch(`${BASE}/repos/${repo}/releases/latest`, {
    headers: headers(),
    next: { revalidate: 3600 }, // 1h
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub release ${repo} ${res.status}`)
  const data = (await res.json()) as {
    tag_name: string
    published_at: string
    html_url: string
  }
  return {
    tag: data.tag_name,
    publishedAt: data.published_at,
    url: data.html_url,
  }
}
