import filesService from "@/lib/services/files.service";
import { Formatter } from "@in.pulse-crm/utils";
import { useContext, useMemo } from "react";
import SimCardDownloadIcon from "@mui/icons-material/SimCardDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import { ChatsReportContext } from "./chats-reports-context";
import { ChatsReport } from "@in.pulse-crm/sdk";

interface ChatReportListItemProps {
  user: string;
  report: ChatsReport & { progress: number };
}

export default function ChatReportListItem({ user, report }: ChatReportListItemProps) {
  const { deleteReport } = useContext(ChatsReportContext);

  const fileUrl = useMemo(() => {
    return filesService.getFileDownloadUrl(report.fileId);
  }, [report.fileId]);

  const statusText = useMemo(() => {
    switch (report.status) {
      case "pending":
        return "Processando";
      case "completed":
        return "Finalizado";
      case "failed":
        return "Falhou";
      default:
        return "Desconhecido";
    }
  }, [report.status]);

  return (
    <tr className="w-max rounded-md text-sm even:bg-indigo-500/5">
      <td className="w-44 px-2 py-3 pl-8">
        {statusText}
        {report.status == "pending" && ` (${report.progress}%)`}
      </td>
      <td className="w-48 truncate px-2 py-3">{user}</td>
      <td className="w-48 truncate px-2 py-3">{Formatter.date(report.exportDate)}</td>
      <td className="w-28 truncate px-2 py-3">{report.startDate}</td>
      <td className="w-28 truncate px-2 py-3">{report.endDate}</td>
      <td className="w-24 truncate px-2 py-3">{report.chats}</td>
      <td className="w-28 truncate px-2 py-3">{report.messages}</td>
      <td className="w-24 truncate px-2 py-3">{report.format.toUpperCase()}</td>
      <td className="flex w-24 items-center justify-end gap-4 truncate px-2 py-3 pr-4">
        <a className="transition-all hover:text-indigo-400" href={fileUrl} title="Baixar">
          <SimCardDownloadIcon />
        </a>
        <button
          className="transition-all hover:text-red-400"
          title="Excluir"
          type="button"
          onClick={() => deleteReport(report.id)}
        >
          <DeleteIcon />
        </button>
      </td>
    </tr>
  );
}
