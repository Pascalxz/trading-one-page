export function Disclaimer({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  const base =
    "text-[11px] leading-relaxed text-muted tracking-wide"
  if (variant === "inline") {
    return (
      <p className={`${base} border-l-2 border-border-strong pl-3`}>
        Outil d&apos;information. Ne constitue pas un conseil financier, fiscal ou juridique.
        L&apos;utilisateur est seul responsable de ses décisions d&apos;investissement.
      </p>
    )
  }
  return (
    <footer className="mt-auto border-t border-border bg-surface/60">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <p className={base}>
          <span className="font-mono uppercase tracking-[0.18em] text-muted-strong">
            Disclaimer —
          </span>{" "}
          Outil d&apos;information seulement. Ne constitue pas un conseil financier,
          fiscal ou juridique. Les données affichées proviennent de sources tierces et
          peuvent être incomplètes ou périmées. L&apos;utilisateur est seul responsable
          de ses décisions d&apos;investissement.
        </p>
      </div>
    </footer>
  )
}
