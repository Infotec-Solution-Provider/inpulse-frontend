"use client";

import { AuthContext } from "@/app/auth-context";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import BugReportIcon from "@mui/icons-material/BugReport";
import BuildIcon from "@mui/icons-material/Build";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import { UserRole } from "@/lib/sdk-local";
import { useContext, useMemo, useState } from "react";
import { CHANGELOG_ENTRIES, ChangelogCategory } from "./changelog-data";

const CATEGORY_LABELS: Record<ChangelogCategory | "todos", string> = {
  todos: "Todos",
  novidade: "Novidades",
  melhoria: "Melhorias",
  correcao: "Correções",
};

const CATEGORY_STYLES: Record<ChangelogCategory, string> = {
  novidade: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  melhoria: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  correcao: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

function CategoryIcon({ category }: { category: ChangelogCategory }) {
  if (category === "novidade") return <NewReleasesIcon fontSize="small" />;
  if (category === "melhoria") return <AutoFixHighIcon fontSize="small" />;
  return <BugReportIcon fontSize="small" />;
}

export default function ChangelogPage() {
  const { user } = useContext(AuthContext);
  const [selectedCategory, setSelectedCategory] = useState<ChangelogCategory | "todos">("todos");

  const entries = useMemo(
    () => CHANGELOG_ENTRIES.filter((entry) => selectedCategory === "todos" || entry.category === selectedCategory),
    [selectedCategory],
  );

  if (!user) {
    return <div className="p-8 text-sm text-slate-500">Carregando permissões...</div>;
  }

  if (user.NIVEL !== UserRole.ADMIN) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <BuildIcon fontSize="small" />
              <span className="text-sm font-semibold uppercase tracking-wide">Produto</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Changelog</h1>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
              Acompanhe as novidades, correções e melhorias mais recentes do Inpulse.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Filtrar changelog">
            {(Object.keys(CATEGORY_LABELS) as Array<ChangelogCategory | "todos">).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {entries.map((entry) => (
            <article key={`${entry.date}-${entry.title}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <time className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">{entry.date}</time>
                <div className="min-w-0 flex-1">
                  <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_STYLES[entry.category]}`}>
                    <CategoryIcon category={entry.category} />
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{entry.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{entry.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhuma atualização encontrada nessa categoria.
          </div>
        )}
      </div>
    </div>
  );
}

