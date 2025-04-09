import filesService from "@/lib/services/files.service";
import { Formatter } from "@in.pulse-crm/utils";
import { useContext, useMemo } from "react";
import SimCardDownloadIcon from "@mui/icons-material/SimCardDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import { ChatsReportContext } from "./context";
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
    <tr className="w-max rounded-md text-sm even:bg-indigo-500 even:bg-opacity-5">
      <td className="px-2 py-3 pl-8">
        {statusText}
        {report.status == "pending" && ` (${report.progress}%)`}
      </td>
      <td className="truncate px-2 py-3">{user}</td>
      <td className="px-2 py-3">{Formatter.date(report.exportDate)}</td>
      <td className="px-2 py-3">{report.startDate}</td>
      <td className="px-2 py-3">{report.endDate}</td>
      <td className="px-2 py-3">{report.chats}</td>
      <td className="px-2 py-3">{report.messages}</td>
      <td className="px-2 py-3">{report.format.toUpperCase()}</td>
      <td className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
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
