import filesService from "@/lib/services/files.service";
import { Formatter } from "@in.pulse-crm/utils";
import { useContext, useMemo, useState } from "react";
import SimCardDownloadIcon from "@mui/icons-material/SimCardDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import { ChatsReportContext } from "./chats-reports-context";
import { ChatsReport } from "@in.pulse-crm/sdk";
import { 
  Tooltip, 
  IconButton, 
  CircularProgress, 
  LinearProgress, 
  TableRow, 
  TableCell 
} from "@mui/material";
import { format, parseISO } from "date-fns";

interface ChatReportListItemProps {
  user: string;
  report: ChatsReport & { progress: number };
}

export default function ChatReportListItem({ user, report }: ChatReportListItemProps) {
  const { deleteReport, isLoading } = useContext(ChatsReportContext);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileUrl = useMemo(() => {
    return report.fileId ? filesService.getFileDownloadUrl(report.fileId) : "#";
  }, [report.fileId]);

  const { statusText, statusColor } = useMemo(() => {
    switch (report.status) {
      case "pending":
        return { 
          statusText: `Processando (${report.progress}%)`,
          statusColor: "text-yellow-500"
        };
      case "completed":
        return { 
          statusText: "Concluído",
          statusColor: "text-green-500"
        };
      case "failed":
        return { 
          statusText: "Falhou",
          statusColor: "text-red-500"
        };
      default:
        return { 
          statusText: "Desconhecido",
          statusColor: "text-gray-500"
        };
    }
  }, [report.status, report.progress]);

  const formattedDate = useMemo(() => {
    if (!report.exportDate) return "-";
    try {
      return format(parseISO(report.exportDate), "dd/MM/yyyy HH:mm");
    } catch {
      return report.exportDate;
    }
  }, [report.exportDate]);

  const handleDelete = async () => {
    if (window.confirm("Tem certeza que deseja excluir este relatório?")) {
      try {
        setIsDeleting(true);
        await deleteReport(report.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDownload = async () => {
    if (report.status !== "completed" || !report.fileId) return;
    
    try {
      setIsDownloading(true);
      const url = await filesService.getFileDownloadUrl(report.fileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-chats-${report.id}.${report.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar o arquivo:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TableRow 
      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        report.status === "pending" ? "animate-pulse" : ""
      }`}
    >
      <TableCell className="w-44 px-4 py-3">
        <div className="flex items-center">
          <span className={`mr-2 h-2.5 w-2.5 rounded-full ${statusColor}`}></span>
          <span className={statusColor}>
            {statusText}
          </span>
        </div>
        {report.status === "pending" && (
          <LinearProgress 
            variant="determinate" 
            value={report.progress} 
            className="mt-1 h-1"
            color="primary"
          />
        )}
      </TableCell>
      
      <TableCell className="w-48 px-4 py-3">
        <div className="truncate" title={user}>
          {user}
        </div>
      </TableCell>
      
      <TableCell className="w-48 px-4 py-3">
        <span className="whitespace-nowrap">{formattedDate}</span>
      </TableCell>
      
      <TableCell className="w-28 px-4 py-3">
        {report.startDate ? format(parseISO(report.startDate), "dd/MM/yyyy") : "-"}
      </TableCell>
      
      <TableCell className="w-28 px-4 py-3">
        {report.endDate ? format(parseISO(report.endDate), "dd/MM/yyyy") : "-"}
      </TableCell>
      
      <TableCell className="w-24 px-4 py-3 text-center">
        {report.chats?.toLocaleString() || "0"}
      </TableCell>
      
      <TableCell className="w-28 px-4 py-3 text-center">
        {report.messages?.toLocaleString() || "0"}
      </TableCell>
      
      <TableCell className="w-24 px-4 py-3">
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
          {report.format.toUpperCase()}
        </span>
      </TableCell>
      
      <TableCell className="w-24 px-4 py-3">
        <div className="flex items-center justify-end space-x-1">
          <Tooltip title={report.status === "completed" ? "Baixar relatório" : "Aguardando conclusão"}>
            <span>
              <IconButton
                size="small"
                onClick={handleDownload}
                disabled={report.status !== "completed" || isDownloading}
                className="text-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600"
                aria-label="Baixar relatório"
              >
                {isDownloading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SimCardDownloadIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Excluir relatório">
            <IconButton
              size="small"
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-gray-600"
              aria-label="Excluir relatório"
            >
              {isDeleting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DeleteIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
