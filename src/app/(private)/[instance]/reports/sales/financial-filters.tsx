"use client";

import { useContext, useMemo } from "react";
import { Button, MenuItem, TextField } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { ReportFilterPanel } from "@/components/reports/ReportWorkflow";
import { SearchableEntityFilter } from "@/components/reports/SearchableEntityFilter";
import { reportOperatorOptions } from "@/lib/reports/operator-options";
import { defaultFinancialFilters, useFinancialContext } from "./financial-context";

export default function FinancialFilters() {
  const { token, instance, user } = useContext(AuthContext);
  const {
    filters,
    setFilters,
    setFilter,
    isLoading,
    generateDashboard,
    appliedFilters,
    dirty,
    setGoalsOpen,
  } = useFinancialContext();
  const loadOptions = useMemo(() => reportOperatorOptions(token ?? ""), [token]);
  return (
    <div className="grid gap-3">
      <ReportFilterPanel
        period={filters}
        onPeriodChange={(period) => setFilters((previous) => ({ ...previous, ...period }))}
        onGenerate={() => void generateDashboard()}
        onClear={() => setFilters(defaultFinancialFilters())}
        onRestore={appliedFilters ? () => setFilters(appliedFilters) : undefined}
        dirty={dirty}
        loading={isLoading}
      >
        <SearchableEntityFilter
          label="Operador"
          scope={`${instance}:${user?.CODIGO}`}
          value={
            filters.operadorId !== undefined
              ? {
                  id: filters.operadorId,
                  label: filters.operadorNome ?? `Operador ${filters.operadorId}`,
                }
              : null
          }
          onChange={(option) =>
            setFilters((previous) => ({
              ...previous,
              operadorId: option?.id,
              operadorNome: option?.label,
            }))
          }
          loadOptions={loadOptions}
        />
        <TextField
          label="Situação"
          select
          size="small"
          InputLabelProps={{ shrink: true }}
          SelectProps={{ displayEmpty: true }}
          value={filters.situacao ?? ""}
          onChange={(event) => setFilter("situacao", event.target.value || undefined)}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="F">Faturado</MenuItem>
          <MenuItem value="C">Cancelado</MenuItem>
        </TextField>
        <TextField
          label="Agrupar por"
          select
          size="small"
          value={filters.groupBy}
          onChange={(event) => setFilter("groupBy", event.target.value as "day" | "month")}
        >
          <MenuItem value="month">Mês</MenuItem>
          <MenuItem value="day">Dia</MenuItem>
        </TextField>
      </ReportFilterPanel>
      <div>
        <Button size="small" variant="outlined" onClick={() => setGoalsOpen(true)}>
          Gerenciar metas
        </Button>
      </div>
    </div>
  );
}
