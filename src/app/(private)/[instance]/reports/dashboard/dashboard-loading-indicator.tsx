interface DashboardLoadingIndicatorProps {
  mode?: "badge" | "overlay";
  label?: string;
}

export default function DashboardLoadingIndicator({
  mode = "badge",
  label = "Atualizando relatório",
}: DashboardLoadingIndicatorProps) {
  if (mode === "overlay") {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center rounded-3xl bg-white/70 px-4 py-10 backdrop-blur-[2px] dark:bg-slate-950/55">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-[0_24px_80px_-32px_rgba(14,116,144,0.65)] ring-1 ring-sky-100 dark:border-sky-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40 dark:ring-sky-500/20">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute h-16 w-16 rounded-full border-4 border-sky-200/70 dark:border-sky-400/20" />
              <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-sky-500 border-r-cyan-400" />
              <div className="absolute h-10 w-10 animate-ping rounded-full bg-sky-400/20 dark:bg-sky-300/10" />
              <div className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.85)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">Carregando</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{label}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Recalculando indicadores, séries e agrupamentos da visão atual.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                <div
                  className="h-2 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400"
                  style={{ animationDelay: `${index * 180}ms` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-2 text-sky-900 shadow-sm ring-1 ring-sky-100 dark:border-sky-500/30 dark:bg-sky-950/35 dark:text-sky-100 dark:ring-sky-500/10">
      <div className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-sky-400/30 dark:bg-sky-300/20" />
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_14px_rgba(14,165,233,0.8)]" />
      </div>
      <div className="leading-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Em progresso</p>
        <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-100">{label}</p>
      </div>
      <div className="flex items-end gap-1 self-stretch py-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="w-1.5 animate-pulse rounded-full bg-gradient-to-t from-sky-500 to-cyan-300"
            style={{ height: `${12 + index * 4}px`, animationDelay: `${index * 140}ms` }}
          />
        ))}
      </div>
    </div>
  );
}