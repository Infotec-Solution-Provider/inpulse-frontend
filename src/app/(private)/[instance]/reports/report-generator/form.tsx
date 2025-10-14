"use client";

import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import { useContext, useState } from "react";
import { SqlReportsContext } from "./sql-reports-context";

export default function SqlReportForm() {
  const {
    executeReport,
    exportReport,
    loading,
    error,
    sql,
    setSql,
    description,
    setDescription,
    resultData,
    resultColumns,
  } = useContext(SqlReportsContext);

  const [modalOpen, setModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sql.trim() || !description.trim()) return;

    try {
      await executeReport(sql, description);
      setModalOpen(true);
    } catch {
      // erro já tratado
    }
  }

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportFormat = async (format: "pdf" | "csv" | "txt") => {
    setAnchorEl(null);
    if (!sql.trim() || !description.trim()) return;
    try {
      await exportReport(sql, description, format);
    } catch {
      // erro tratado no contexto
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="Descrição"
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <TextField
          label="SQL SELECT"
          variant="outlined"
          multiline
          rows={12}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          required
          spellCheck={false}
          inputProps={{ style: { fontFamily: "monospace" } }}
        />
        {error && <div className="text-red-500">{error}</div>}
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Executar SQL"}
        </Button>
      </form>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Resultado da Consulta</DialogTitle>
        <DialogContent dividers>
          {resultData.length === 0 ? (
            <p>Nenhum dado retornado.</p>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {resultColumns.map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {resultData.map((row, i) => (
                  <TableRow key={i}>
                    {resultColumns.map((col) => (
                      <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Fechar</Button>

          <Tooltip title="Exportar relatório">
            <IconButton onClick={handleExportClick}>
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            {["pdf", "csv"].map((format) => (
              <MenuItem key={format} onClick={() => handleExportFormat(format as any)}>
                Exportar como {format.toUpperCase()}
              </MenuItem>
            ))}
          </Menu>
        </DialogActions>
      </Dialog>
    </>
  );
}
