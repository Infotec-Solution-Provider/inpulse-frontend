"use client";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import { MenuItem, TextField } from "@mui/material";
import { normalizeReportSearch } from "@/lib/reports/catalog";

import { AssessmentOutlined as AssessmentOutlinedIcon } from "@/lib/ui-system/crm-icons";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listGeneratedReports } from "@/lib/reports/api";
import type { GeneratedReportArtifact } from "@/types/generated-reports";

export default function GeneratedReportsPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();
  const [reports, setReports] = useState<GeneratedReportArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const terms = normalizeReportSearch(search).split(/\s+/).filter(Boolean);
  const visible = reports.filter(
    (report) =>
      (status === "all" || report.status === status) &&
      terms.every((term) =>
        normalizeReportSearch(
          [report.title, report.description, report.summary, report.createdByUserName].join(" "),
        ).includes(term),
      ),
  );
  useEffect(() => {
    const controller = new AbortController();
    void listGeneratedReports(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setReports(items);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Falha ao listar relatórios.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return (
    <ReportPageShell
      instance={instance}
      category="Personalizados"
      title="Relatórios personalizados"
      description="Encontre relatórios salvos pela equipe e seus rascunhos privados."
    >
      <div className="flex flex-wrap gap-3">
        <TextField
          size="small"
          label="Pesquisar relatórios personalizados"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <TextField
          select
          size="small"
          label="Situação"
          value={status}
          sx={{ minWidth: 165 }}
          onChange={(event) => setStatus(event.target.value)}
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="SAVED">Salvos</MenuItem>
          <MenuItem value="DRAFT">Rascunhos</MenuItem>
        </TextField>
      </div>
      {loading ? (
        <div className="flex justify-center p-16">
          <CircularProgress />
        </div>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info">
          {reports.length
            ? "Nenhum relatório corresponde à pesquisa."
            : "Nenhum relatório personalizado foi criado."}
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((report) => (
            <Card key={report.id} variant="outlined">
              <CardActionArea
                onClick={() => router.push(`/${instance}/reports/generated/${report.id}`)}
              >
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <AssessmentOutlinedIcon color="primary" />
                    <Chip
                      size="small"
                      color={report.status === "SAVED" ? "success" : "default"}
                      label={report.status === "SAVED" ? "Salvo" : "Rascunho"}
                    />
                  </div>
                  <Typography fontWeight={700}>{report.title}</Typography>
                  <Typography variant="body2" color="text.secondary" className="line-clamp-2">
                    {report.description || report.summary || "Sem descrição."}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Atualizado em {new Date(report.updatedAt).toLocaleString("pt-BR")}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </div>
      )}
    </ReportPageShell>
  );
}
