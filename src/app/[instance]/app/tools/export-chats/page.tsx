"use client";
import axios from "axios";

import { useCallback, useEffect, useState } from "react";
import { ExportedChatInfo } from "@/lib/types/export-chats.types";
import { DataResponse, User } from "@in.pulse-crm/types";
import usersService from "@/lib/services/users.service";
import ExportChatsForm from "./export-chats-form";
import ExportChatsList from "./export-chats-list";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import whatsappService from "@/lib/services/whatsapp.service";



export default function Home() {
    const [users, setUsers] = useState<Array<User>>([]);
    const [exports, setExports] = useState<Array<ExportedChatInfo>>([]);
    const pathname = usePathname();
    const instance = pathname.split("/")[1];

    useEffect(() => {
        usersService.getUsers(instance)
            .then(({ data }) => setUsers(data.filter(u => u.CODIGO > 0)))
            .catch((err) => toast.error("Falha ao buscar usuários: " + err.message));

        whatsappService.getExports(instance).then((exports) => setExports(exports));
    }, []);

    const onSuccessAction = useCallback(
        async () => setExports(await whatsappService.getExports(instance)),
        [exports],
    );

    const onDeleteAction = useCallback(
        async (filename: string) => {
            await whatsappService.deleteExport(instance, filename);
            setExports(await whatsappService.getExports(instance));
        },
        [exports],
    );

    return (
        <div className="w-[75rem] mx-auto py-8 px-4 box-border">
            <ExportChatsForm users={users} onSuccessAction={onSuccessAction} />
            <div className="mx-auto my-8 w-[75rem]">
                <h2 className="my-6">Histórico de exportações</h2>
                <ExportChatsList exports={exports} onDelete={onDeleteAction} />
            </div>
        </div>
    );
}
