"use client";
import { CrmPage, CrmFilters, CrmTableHead, useCrmQueryState } from "@/lib/ui-system";

import { useEffect, useState } from "react";
import { getMetrics, deleteMetric } from "@/lib/reports/api";
import { Metric } from "@/types/reports";
import { useParams, useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import { Add as AddIcon } from "@/lib/ui-system/crm-icons";
import { Delete as DeleteIcon } from "@/lib/ui-system/crm-icons";

const VIZ_LABELS: Record<string, string> = {
  bar: "Barra",
  line: "Linha",
  pie: "Pizza",
  table: "Tabela",
  card: "Card",
};

export default function MetricsPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getMetrics().catch(() => [] as Metric[]);
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta métrica?")) return;
    await deleteMetric(id).catch(() => null);
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  const [filters, setFilters] = useCrmQueryState<Record<string, string>>("report-metrics-list", {});
  const filtered = metrics.filter(
    (metric) =>
      !filters.name || metric.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase()),
  );
  return (
    <CrmPage
      title="Métricas"
      description="Organize as definições de métricas dos relatórios."
      count={loading ? undefined : filtered.length}
      breadcrumbs={[{ label: "Relatórios" }, { label: "Métricas" }]}
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push(`/${instance}/reports/metrics/new`)}
        >
          Nova métrica
        </Button>
      }
    >
      <CrmFilters
        fields={[{ key: "name", label: "Nome" }]}
        values={filters}
        onApply={setFilters}
        onRefresh={() => void load()}
        loading={loading}
      />
      {loading ? (
        <div className="ip-crud-state">
          <CircularProgress size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="ip-crud-record ip-crud-state">Nenhuma métrica encontrada.</div>
      ) : (
        <div className="ip-crud-table">
          <Table>
            <CrmTableHead
              labels={["Nome", "Tabela", "Agregação", "Coluna", "Visualização", "Ações"]}
            />
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell data-label="Nome">{m.name}</TableCell>
                  <TableCell data-label="Tabela">
                    <code>{m.tableName}</code>
                  </TableCell>
                  <TableCell data-label="Agregação">{m.aggregation.toUpperCase()}</TableCell>
                  <TableCell data-label="Coluna">{m.column}</TableCell>
                  <TableCell data-label="Visualização">
                    <Chip
                      label={VIZ_LABELS[m.visualizationType] ?? m.visualizationType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell data-label="Ações" align="right">
                    <Button color="error" onClick={() => void handleDelete(m.id)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CrmPage>
  );
}
