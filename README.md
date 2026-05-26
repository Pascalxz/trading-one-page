# Liquidity Lens

Tableau de bord IA unifié : portefeuille, macro et activité de développement crypto.
Voir le PRD complet pour la vision, le cadrage légal et la roadmap.

## Stack

- **Next.js 16** (App Router, Server Components, TypeScript strict)
- **Supabase** (Postgres + RLS + Auth)
- **Tailwind CSS 4** — direction esthétique « terminal sobre » (fond sombre profond, mono pour les données, accent ambre)
- **Anthropic Claude** (phase 4 — 4 modes IA)

## Lancer en local

```bash
pnpm install
cp .env.example .env.local   # remplir les clés
pnpm dev
```

Ouvrir <http://localhost:3000>.

## Architecture

```
src/
  app/
    (auth)/        login + signup (Server Actions)
    (dashboard)/   layout protégé + pages des piliers
    auth/          routes utilitaires (signout)
  components/      UI partagée
  lib/
    supabase/      clients browser / server / middleware
    types/         types générés depuis le schéma Supabase
supabase/
  migrations/      schéma versionné (à appliquer via MCP ou CLI)
```

## Roadmap (cf. PRD §11)

- **Phase 0 — Fondations** ✅ Auth, schéma + RLS, layout, navigation.
- **Phase 1 — Portefeuille** Import CSV Questrade, calculs, thèmes, zombies.
- **Phase 2 — Macro** FRED (M2, CPI, taux Fed), calendrier catalyseurs, overlay.
- **Phase 3 — Dev/On-chain** GitHub + CoinGecko, activité dev vs prix.
- **Phase 4 — IA** Briefing quotidien, alertes contextuelles, analyse à la demande, agents.
- **Phase 5 — Polissage** États, fraîcheur, accessibilité, i18n FR/EN.

## Disclaimer

Outil d'information. Ne constitue pas un conseil financier, fiscal ou juridique.
Voir PRD §3 (cadrage légal — contrainte de design non négociable).
