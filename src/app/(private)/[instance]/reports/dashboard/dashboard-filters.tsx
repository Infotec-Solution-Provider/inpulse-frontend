"use client";

import { DashboardContext } from "./dashboard-context";
import { Button, TextField } from "@mui/material";
import { useContext, useMemo, useState } from "react";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";

export default function DashboardFilters() {
  const { filters, setFilters, loadReport, loading } = useContext(DashboardContext);
  const [local, setLocal] = useState(filters);

  const hasChanges = useMemo(() => JSON.stringify(local) !== JSON.stringify(filters), [local, filters]);

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-md bg-indigo-700/5 px-4 py-4 text-xs shadow-md"
      onSubmit={(e) => {
        e.preventDefault();
        setFilters(local);
        loadReport();
      }}
    >
      <TextField
        label="Início (Usuários/Contatos)"
        type="date"
        size="small"
        value={local.startDate}
        onChange={(e) => setLocal((prev) => ({ ...prev, startDate: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        className="w-48"
      />
      <TextField
        label="Fim (Usuários/Contatos)"
        type="date"
        size="small"
        value={local.endDate}
        onChange={(e) => setLocal((prev) => ({ ...prev, endDate: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        className="w-48"
      />
      <TextField
        label="Operador"
        size="small"
        value={local.userId}
        onChange={(e) => setLocal((prev) => ({ ...prev, userId: e.target.value }))}
        placeholder="ID do operador"
        className="w-40"
      />
      <TextField
        label="Setores (CSV ou *)"
        size="small"
        value={local.sectors}
        onChange={(e) => setLocal((prev) => ({ ...prev, sectors: e.target.value }))}
        placeholder="* ou 1,2"
        className="w-44"
      />
      <TextField
        label="Operadores (CSV ou *)"
        size="small"
        value={local.operators}
        onChange={(e) => setLocal((prev) => ({ ...prev, operators: e.target.value }))}
        placeholder="* ou 10,20"
        className="w-44"
      />
      <TextField
        label="Mín (Hora/Dia)"
        type="date"
        size="small"
        value={local.minDate}
        onChange={(e) => setLocal((prev) => ({ ...prev, minDate: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        className="w-40"
      />
      <TextField
        label="Máx (Hora/Dia)"
        type="date"
        size="small"
        value={local.maxDate}
        onChange={(e) => setLocal((prev) => ({ ...prev, maxDate: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        className="w-40"
      />
      <Button
        type="submit"
        variant="contained"
        size="small"
        className="bg-indigo-600"
        startIcon={<ArrowRightAltIcon />}
        disabled={loading || !hasChanges}
      >
        Atualizar
      </Button>
      <Button
        type="button"
        variant="outlined"
        size="small"
        onClick={() => loadReport()}
        disabled={loading}
      >
        Recarregar
      </Button>
    </form>
  );
}
