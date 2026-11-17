"use client";

import Link from "next/link";
import { Alert, Chip, InputAdornment, TextField } from "@mui/material";
import { ArrowUpRight, Search } from "lucide-react";
import { REPORT_CATEGORIES, searchReports, type ReportDefinition } from "@/lib/reports/catalog";

export function ReportCatalogView({
  instance,
  reports,
  query,
  category,
  onChange,
}: {
  instance: string;
  reports: ReportDefinition[];
  query: string;
  category: string;
  onChange: (query: string, category: string) => void;
}) {
  const categories = REPORT_CATEGORIES.filter((item) =>
    reports.some((report) => report.category === item.id),
  );
  const visible = searchReports(reports, query, category);
  return (
    <div className="box-border h-full min-w-0 overflow-y-auto bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:p-6">
      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] gap-6">
        <header>
          <p className="mb-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Análises e resultados
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Encontre a análise que precisa, escolha os filtros e gere seu relatório.
          </p>
        </header>
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <TextField
            label="Buscar relatório"
            value={query}
            onChange={(event) => onChange(event.target.value, category)}
            placeholder="Nome, assunto ou palavra-chave"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <div className="flex flex-wrap gap-2" aria-label="Categorias de relatórios">
            {[{ id: "all", title: "Todos" }, ...categories].map((item) => (
              <Chip
                key={item.id}
                label={item.title}
                color={category === item.id ? "primary" : "default"}
                variant={category === item.id ? "filled" : "outlined"}
                onClick={() => onChange(query, item.id)}
                aria-pressed={category === item.id}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400" role="status">
          {visible.length}{" "}
          {visible.length === 1 ? "relatório encontrado" : "relatórios encontrados"}
        </p>
        {!visible.length && (
          <Alert severity="info">
            Nenhum relatório encontrado. Tente outro termo ou categoria.
          </Alert>
        )}
        {categories.map((item) => {
          const group = visible.filter((report) => report.category === item.id);
          if (!group.length) return null;
          return (
            <section key={item.id} className="grid gap-3" aria-label={item.title}>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.map((report) => (
                  <Link
                    key={report.id}
                    href={`/${instance}${report.href}`}
                    className="group flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {report.title}
                      </h3>
                      <ArrowUpRight
                        size={18}
                        className="shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {report.description}
                    </p>
                    <span className="mt-auto text-xs font-medium text-slate-500 dark:text-slate-400">
                      {report.output}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
