"use client";

import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { Button, MenuItem, TextField } from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { AuthContext } from "@/app/auth-context";
import useInternalChatContext from "../../internal-context";
import { DashboardContext } from "./dashboard-context";
import { useWhatsappContext } from "../../whatsapp-context";

const ALL_OPTION_VALUE = "__ALL__";

function parseOperators(value: string): string[] {
  if (!value || value === "*") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSectors(value: string): string[] {
  if (!value || value === "*") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DashboardFilters() {
  const { filters, setFilters, loadReport, loading, selectedReport } = useContext(DashboardContext);
  const { instance } = useContext(AuthContext);
  const [local, setLocal] = useState(filters);

  const isExatronInstance = instance === "exatron";

  const { users } = useInternalChatContext();
  const { sectors } = useWhatsappContext();

  const operatorOptions = useMemo(
    () =>
      users
        .filter((user) => Number.isFinite(Number(user.CODIGO)))
        .map((user) => ({
          id: String(user.CODIGO),
          name: user.NOME || user.LOGIN || `#${user.CODIGO}`,
        })),
    [users],
  );

  const sectorOptions = useMemo(
    () =>
      sectors
        .filter((sector) => Number.isFinite(Number(sector.id)))
        .map((sector) => ({
          id: String(sector.id),
          name: sector.name || `#${sector.id}`,
        })),
    [sectors],
  );

  const selectedOperatorIds = useMemo(() => parseOperators(local.operators), [local.operators]);
  const selectedSectorIds = useMemo(() => parseSectors(local.sectors), [local.sectors]);

  const hasChanges = useMemo(
    () => JSON.stringify(local) !== JSON.stringify(filters),
    [local, filters],
  );

  const handleOperatorsChange = (ids: string[]) => {
    if (ids.includes(ALL_OPTION_VALUE)) {
      setLocal((prev) => ({ ...prev, operators: "*" }));
      return;
    }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    setLocal((prev) => ({
      ...prev,
      operators: uniqueIds.length ? uniqueIds.join(",") : "*",
    }));
  };

  const handleSectorsChange = (ids: string[]) => {
    if (ids.includes(ALL_OPTION_VALUE)) {
      setLocal((prev) => ({ ...prev, sectors: "*" }));
      return;
    }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    setLocal((prev) => ({
      ...prev,
      sectors: uniqueIds.length ? uniqueIds.join(",") : "*",
    }));
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-md bg-indigo-700/5 px-4 py-4 text-xs shadow-md"
      onSubmit={(e) => {
        e.preventDefault();
        setFilters(local);
        loadReport(selectedReport, local);
      }}
    >
      {(selectedReport === "messagesPerUser" ||
        selectedReport === "messagesPerContact" ||
        selectedReport === "satisfactionSurvey") && (
        <>
          <TextField
            label="Data inicial"
            type="date"
            size="small"
            value={local.startDate}
            onChange={(e) => setLocal((prev) => ({ ...prev, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            className="w-48"
          />
          <TextField
            label="Data final"
            type="date"
            size="small"
            value={local.endDate}
            onChange={(e) => setLocal((prev) => ({ ...prev, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            className="w-48"
          />
        </>
      )}

      {selectedReport === "messagesPerContact" && (
        <TextField
          select
          label="Operador"
          size="small"
          value={local.userId || ""}
          onChange={(e) => setLocal((prev) => ({ ...prev, userId: e.target.value }))}
          className="w-56"
        >
          <MenuItem value="">Todos</MenuItem>
          {operatorOptions.map((operator) => (
            <MenuItem key={operator.id} value={operator.id}>
              {operator.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {selectedReport === "messagesPerHourDay" && (
        <>
          <TextField
            select
            label="Setores"
            size="small"
            value={selectedSectorIds}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => {
              const value = e.target.value;
              handleSectorsChange(Array.isArray(value) ? value : [value]);
            }}
            className="w-64"
            SelectProps={{
              multiple: true,
              displayEmpty: true,
              renderValue: (selected) => {
                const selectedIds = selected as string[];
                if (!selectedIds.length) return "Todos";

                return selectedIds
                  .map((id) => sectorOptions.find((option) => option.id === id)?.name || `#${id}`)
                  .join(", ");
              },
            }}
          >
            <MenuItem value={ALL_OPTION_VALUE}>Todos</MenuItem>
            {sectorOptions.map((sector) => (
              <MenuItem key={sector.id} value={sector.id}>
                {sector.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Operadores"
            size="small"
            value={selectedOperatorIds}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => {
              const value = e.target.value;
              handleOperatorsChange(Array.isArray(value) ? value : [value]);
            }}
            className="w-64"
            SelectProps={{
              multiple: true,
              displayEmpty: true,
              renderValue: (selected) => {
                const selectedIds = selected as string[];
                if (!selectedIds.length) return "Todos";

                return selectedIds
                  .map((id) => operatorOptions.find((option) => option.id === id)?.name || `#${id}`)
                  .join(", ");
              },
            }}
          >
            <MenuItem value={ALL_OPTION_VALUE}>Todos</MenuItem>
            {operatorOptions.map((operator) => (
              <MenuItem key={operator.id} value={operator.id}>
                {operator.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Data mínima"
            type="date"
            size="small"
            value={local.minDate}
            onChange={(e) => setLocal((prev) => ({ ...prev, minDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            className="w-40"
          />
          <TextField
            label="Data máxima"
            type="date"
            size="small"
            value={local.maxDate}
            onChange={(e) => setLocal((prev) => ({ ...prev, maxDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            className="w-40"
          />
        </>
      )}

      {selectedReport === "satisfactionSurvey" && isExatronInstance && (
        <TextField
          select
          label="Operadores"
          size="small"
          value={selectedOperatorIds}
          InputLabelProps={{ shrink: true }}
          onChange={(e) => {
            const value = e.target.value;
            handleOperatorsChange(Array.isArray(value) ? value : [value]);
          }}
          className="w-64"
          SelectProps={{
            multiple: true,
            displayEmpty: true,
            renderValue: (selected) => {
              const selectedIds = selected as string[];
              if (!selectedIds.length) return "Todos";

              return selectedIds
                .map((id) => operatorOptions.find((option) => option.id === id)?.name || `#${id}`)
                .join(", ");
            },
          }}
        >
          <MenuItem value={ALL_OPTION_VALUE}>Todos</MenuItem>
          {operatorOptions.map((operator) => (
            <MenuItem key={operator.id} value={operator.id}>
              {operator.name}
            </MenuItem>
          ))}
        </TextField>
      )}
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
