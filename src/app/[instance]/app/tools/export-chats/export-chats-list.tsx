import filesService from "@/lib/services/files.service";
import reportsService from "@/lib/services/reports.service";
import { ChatReport, User } from "@in.pulse-crm/sdk";
import { Formatter, sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { usePathname } from "next/navigation";
import { FaFileDownload } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import { toast } from "react-toastify";

interface ExportChatsListProps {
    users: Array<User>;
    exports: Array<ChatReport>;
    onDelete: (id: number, message: string) => void;
}

export default function ExportChatsList({ exports, users, onDelete }: ExportChatsListProps) {
    const pathname = usePathname();
    const instance = pathname.split("/")[1];

    const handleDelete = (id: number) => {
        return async () => {
            try {
                const result = await reportsService.deleteReport(instance, id)
                onDelete(id, result.message);
            } catch (error: unknown) {
                toast.error("Falha ao excluir exportação!\n" + sanitizeErrorMessage(error));
            }
        }
    }

    const downloadUrl = (id: number) => {
        return filesService.getFileDownloadUrl(id);
    }

    return (
        <div className="mx-auto w-full">
            <div>
                <header className="flex w-max rounded-md bg-indigo-400 bg-opacity-20 px-8 py-4">
                    <div className="w-96 px-2">Usuário</div>
                    <div className="w-48 px-2">Data Exportação</div>
                    <div className="w-48 px-2">Data Início</div>
                    <div className="w-48 px-2">Data Fim</div>
                    <div className="w-32 px-2">Formato</div>
                    <div className="w-32 px-2"></div>
                </header>
                <ul className="w-full py-2">
                    {exports.map((e, index) => (
                        <li
                            className="flex w-max rounded-md px-8 py-2 even:bg-indigo-400 even:bg-opacity-5"
                            key={`export-chat:${index}`}
                        >
                            <div className="w-96 px-2">{users.find(u => u.CODIGO === +e.userId)?.NOME || "TODOS"}</div>
                            <div className="w-48 px-2">{Formatter.date(e.exportDate)}</div>
                            <div className="w-48 px-2">{e.startDate}</div>
                            <div className="w-48 px-2">{e.endDate}</div>
                            <div className="w-32 px-2">{e.format.toUpperCase()}</div>
                            <div className="flex w-32 justify-end gap-4 px-2 items-center">
                                <a
                                    className="transition-all hover:text-xl hover:text-indigo-400 "
                                    href={downloadUrl(e.id)}
                                    title="Baixar"
                                >
                                    <FaFileDownload />
                                </a>
                                <button
                                    className="hover:text-x transition-all hover:text-red-400"
                                    title="Excluir"
                                    type="button"
                                    onClick={handleDelete(e.id)}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
