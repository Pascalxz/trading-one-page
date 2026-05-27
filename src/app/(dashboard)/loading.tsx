export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <div className="h-8 w-1/3 rounded bg-surface-2 animate-pulse" />
      <div className="h-4 w-2/3 rounded bg-surface-2 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-lg border border-border bg-surface/40 animate-pulse"
          />
        ))}
      </div>
      <div className="h-48 rounded-lg border border-border bg-surface/40 animate-pulse" />
    </div>
  )
}
