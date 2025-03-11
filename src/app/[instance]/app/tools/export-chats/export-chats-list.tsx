import { ExportedChatInfo } from "@/lib/types/export-chats.types";
import { usePathname } from "next/navigation";
import { FaFileDownload } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";


interface ExportChatsListProps {
    exports: Array<ExportedChatInfo>;
    onDelete: (filename: string) => void;
}

export default function ExportChatsList({ exports, onDelete }: ExportChatsListProps) {
    const pathname = usePathname();
    const instance = pathname.split("/")[1];
    const downloadUrl = process.env["NEXT_PUBLIC_WHATS_URL"] + `/${instance}/files/`;
    const token = localStorage.getItem("@inpulse/token");

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
                            <div className="w-96 px-2">{e.userName}</div>
                            <div className="w-48 px-2">{new Date(e.exportDate).toLocaleString()}</div>
                            <div className="w-48 px-2">{e.startDate}</div>
                            <div className="w-48 px-2">{e.endDate}</div>
                            <div className="w-32 px-2">{e.format.toUpperCase()}</div>
                            <div className="flex w-32 justify-end gap-4 px-2 items-center">
                                <a
                                    className="transition-all hover:text-xl hover:text-indigo-400 "
                                    href={downloadUrl + e.fileName + "?token=" + token}
                                    title="Baixar"
                                >
                                    <FaFileDownload />
                                </a>
                                <button
                                    className="hover:text-x transition-all hover:text-red-400"
                                    title="Excluir"
                                    type="button"
                                    onClick={() => onDelete(e.fileName)}
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
