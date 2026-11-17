"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { AuthContext } from "@/app/auth-context";
import financialService from "@/lib/services/financial.service";
import {
  defaultReportPeriod,
  previousReportPeriod,
  validateReportPeriod,
} from "@/lib/reports/filters";
import { useReportExecution } from "@/lib/reports/use-report-execution";

export interface FinancialFilters {
  startDate: string;
  endDate: string;
  operadorId: number | undefined;
  operadorNome?: string;
  groupBy: "day" | "month";
  situacao: string | undefined;
}

export function defaultFinancialFilters(): FinancialFilters {
  return { ...defaultReportPeriod(), operadorId: undefined, groupBy: "month", situacao: undefined };
}

export function useFinancialReport(token: string, scope: string) {
  const [filters, setFilters] = useState<FinancialFilters>(defaultFinancialFilters);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const execute = useCallback(
    async (applied: FinancialFilters, signal: AbortSignal) => {
      const previous = previousReportPeriod(applied);
      return financialService.getDashboard(
        token,
        {
          startDate: applied.startDate,
          endDate: applied.endDate,
          ...(applied.operadorId !== undefined && { operadorId: applied.operadorId }),
          groupBy: applied.groupBy,
          ...(applied.situacao && { situacao: applied.situacao }),
          compareStartDate: previous.startDate,
          compareEndDate: previous.endDate,
        },
        signal,
      );
    },
    [token],
  );
  const execution = useReportExecution({ scope, execute, validate: validateReportPeriod });
  const dirty = Boolean(
    execution.applied && JSON.stringify(filters) !== JSON.stringify(execution.applied),
  );
  const setFilter = useCallback(
    <K extends keyof FinancialFilters>(key: K, value: FinancialFilters[K]) =>
      setFilters((previous) => ({ ...previous, [key]: value })),
    [],
  );
  return {
    filters,
    setFilters,
    setFilter,
    data: execution.result,
    isLoading: execution.loading,
    appliedFilters: execution.applied,
    generatedAt: execution.generatedAt,
    error: execution.error,
    dirty,
    generateDashboard: () => execution.generate(filters),
    // Goal editors refresh the displayed execution, never unsubmitted filters.
    loadDashboard: () =>
      execution.applied ? execution.generate(execution.applied) : Promise.resolve(),
    goalsOpen,
    setGoalsOpen,
  };
}

export const FinancialContext = createContext({} as ReturnType<typeof useFinancialReport>);
export function useFinancialContext() {
  return useContext(FinancialContext);
}

function FinancialScopeProvider({
  children,
  token,
  scope,
}: {
  children: ReactNode;
  token: string;
  scope: string;
}) {
  const value = useFinancialReport(token, scope);
  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
}

export default function FinancialProvider({ children }: { children: ReactNode }) {
  const { token, instance, user } = useContext(AuthContext);
  if (!token || !user) return <p className="p-6">Carregando sessão…</p>;
  const scope = `${instance}:${user.CODIGO}`;
  return (
    <FinancialScopeProvider key={scope} token={token} scope={scope}>
      {children}
    </FinancialScopeProvider>
  );
}
