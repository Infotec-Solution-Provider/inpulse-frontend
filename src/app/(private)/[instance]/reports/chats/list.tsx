"use client";
import { useContext } from "react";
import { ChatsReportContext } from "./chats-reports-context";
import ChatReportListItem from "./list-item";
import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";

export default function ChatsReportList() {
  const { reports, users, isLoading = false } = useContext(ChatsReportContext);

  // Esqueleto de carregamento
  if (isLoading && reports.length === 0) {
    return (
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                {['Status', 'Usuário', 'Gerado em', 'De', 'Até', 'Chats', 'Mensagens', 'Formato', 'Ações'].map((header, i) => (
                  <TableCell key={i}>
                    <Skeleton variant="text" width={i === 1 ? 120 : 80} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...Array(5)].map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {[...Array(9)].map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton variant="text" width={cellIndex === 1 ? 150 : 80} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum relatório gerado</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Comece gerando seu primeiro relatório usando o formulário acima.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <TableContainer>
        <Table>
          <TableHead className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableCell className="w-44">Status</TableCell>
              <TableCell className="w-48">Usuário</TableCell>
              <TableCell className="w-48">Gerado em</TableCell>
              <TableCell className="w-28">De</TableCell>
              <TableCell className="w-28">Até</TableCell>
              <TableCell className="w-24">Chats</TableCell>
              <TableCell className="w-28">Mensagens</TableCell>
              <TableCell className="w-24">Formato</TableCell>
              <TableCell className="w-24 text-right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.map((report) => (
              <ChatReportListItem
                key={`report-${report.id}`}
                report={report}
                user={users.find((u) => u.CODIGO == +report.userId)?.NOME || "Todos"}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
