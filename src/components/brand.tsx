export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
        ? "text-base"
        : "text-xl"
  return (
    <div className={`flex items-baseline gap-2 ${cls}`}>
      <span className="font-mono font-medium tracking-[0.22em] uppercase text-accent">
        LL
      </span>
      <span className="font-semibold tracking-tight text-foreground">
        Liquidity Lens
      </span>
    </div>
  )
}
