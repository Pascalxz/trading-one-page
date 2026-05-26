import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"
import { getSupabasePublicEnv } from "@/lib/env"

const PROTECTED_PREFIXES = ["/dashboard", "/portefeuille", "/macro", "/projets", "/analyse", "/reglages"]
const AUTH_ONLY_PREFIXES = ["/login", "/signup"]

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p))

  // Home, /auth/*, /_next, etc. → pas besoin d'évaluer la session.
  if (!needsAuth && !isAuthOnly) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabasePublicEnv()
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (needsAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthOnly && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
