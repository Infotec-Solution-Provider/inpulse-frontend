"use client";

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import reportsService from "@/lib/services/reports.service";
import { SqlReport } from "./sql-report";
import { AuthContext } from "@/app/auth-context";

interface SqlReportsContextType {
  history: SqlReport[];
  loading: boolean;
  error: string | null;
  sql: string;
  description: string;
  setSql: (sql: string) => void;
  setDescription: (desc: string) => void;
  fillForm: (sql: string, desc: string) => void;
  exportReport: (sql: string, description: string, format: 'pdf' | 'csv' | 'txt') => Promise<void>;
  executeReport: (sql: string, description: string) => Promise<ReportResult>;
  reloadHistory: () => Promise<void>;
  resultData: any[];
  resultColumns: string[];
  deleteReport: (id: string) => Promise<void>;
}
type ReportResult = {
  rows: Record<string, any>[];
};

export const SqlReportsContext = createContext<SqlReportsContextType>({
  history: [],
  loading: false,
  error: null,
  sql: "",
  description: "",
  setSql: () => {},
  setDescription: () => {},
  fillForm: () => {},
  exportReport: async () => {},
  executeReport: async () => ({ rows: [] }),
  reloadHistory: async () => {},
  resultData: [],
  resultColumns: [],
  deleteReport: async (id: string) => {},

});

export default function SqlReportsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [history, setHistory] = useState<SqlReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useContext(AuthContext);

  const [sql, setSql] = useState("");
  const [description, setDescription] = useState("");
  const [resultData, setResultData] = useState<any[]>([]);
  const [resultColumns, setResultColumns] = useState<string[]>([]);

  const fillForm = (sqlText: string, desc: string) => {
    setSql(sqlText);
    setDescription(desc);
  };

  async function reloadHistory() {
    setLoading(true);
    try {
      if (token) reportsService.setAuth(token);
      const data = await reportsService.getSqlReportsHistory();
      setHistory(data);
      setError(null);
    } catch (err) {
      setError("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

async function executeReport(sql: string, description: string) {
  setLoading(true);
  try {
    if (token) reportsService.setAuth(token);

    const rows = await reportsService.executeSqlReport({ sql, description }) || [];

    if (rows.length) {
      setResultColumns(Object.keys(rows[0]));
      setResultData(rows);
    } else {
      setResultColumns([]);
      setResultData([]);
    }

    await reloadHistory();
    setError(null);
    return { rows }; // para manter o tipo ReportResult
  } catch (err) {
    setError("Erro ao gerar relatório");
    throw new Error("Erro ao gerar relatório");
  } finally {
    setLoading(false);
  }
}

async function exportReport(sql: string, description: string, format: 'pdf' | 'csv' | 'txt') {
  setLoading(true);
  try {
    if (token) reportsService.setAuth(token);
    const blob = await reportsService.exportReportSql({ sql, description, format });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    await reloadHistory();
    setError(null);
  } catch {
    setError("Erro ao exportar relatório SQL");
  } finally {
    setLoading(false);
  }
}
 async function deleteReport(id: string) {
    setLoading(true);
    try {
      if (token) reportsService.setAuth(token);
      await reportsService.deleteHistoryReport(+id);
      await reloadHistory();
      setError(null);
    } catch {
      setError("Erro ao deletar relatório");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reloadHistory();
  }, []);

  return (
    <SqlReportsContext.Provider
      value={{
        history,
        loading,
        error,
        sql,
        description,
        setSql,
        setDescription,
        fillForm,
        exportReport,
        executeReport,
        reloadHistory,
        resultData,
        resultColumns,
        deleteReport,
      }}
    >
      {children}
    </SqlReportsContext.Provider>
  );
}
