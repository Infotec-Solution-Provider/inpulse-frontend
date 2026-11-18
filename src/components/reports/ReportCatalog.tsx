"use client";

import Link from "next/link";
import { Alert, Chip, InputAdornment, TextField } from "@mui/material";
import { ArrowUpRight, ChartColumn, FileDown, LayoutDashboard, Search } from "lucide-react";
import { REPORT_CATEGORIES, searchReports, type ReportDefinition } from "@/lib/reports/catalog";

const outputIcons = { Arquivo: FileDown, Painel: LayoutDashboard, "Tabela e gráfico": ChartColumn };

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
        <div className="grid gap-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-5 dark:border-slate-800 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-900 md:p-7">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Relatórios</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Busque por nome ou assunto, ou explore os relatórios por categoria.
            </p>
          </header>
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
                {group.map((report) => {
                  const Icon = outputIcons[report.output];
                  return (
                    <Link
                      key={report.id}
                      href={`/${instance}${report.href}`}
                      className="group flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <ArrowUpRight
                          size={18}
                          className="shrink-0 text-slate-400 group-hover:text-indigo-500"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="grid gap-1">
                        <h3 className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {report.title}
                        </h3>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {report.description}
                        </p>
                      </div>
                      <span className="mt-auto text-xs font-medium text-slate-500 dark:text-slate-400">
                        {report.output}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
