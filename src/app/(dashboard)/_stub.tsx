export function PhaseStub({
  phase,
  title,
  description,
}: {
  phase: string
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-3">
        {phase}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-3">{title}</h1>
      <p className="text-muted leading-relaxed">{description}</p>
    </div>
  )
}
