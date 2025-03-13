"use client";

import { useCallback, useEffect, useState } from "react";

import usersService from "@/lib/services/users.service";
import ExportChatsForm from "./export-chats-form";
import ExportChatsList from "./export-chats-list";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import reportsService from "@/lib/services/reports.service";
import { ChatReport, User } from "@in.pulse-crm/sdk";

export default function Home() {
    const [users, setUsers] = useState<Array<User>>([]);
    const [exports, setExports] = useState<Array<ChatReport>>([]);
    const pathname = usePathname();
    const instance = pathname.split("/")[1];

    useEffect(() => {
        usersService.getUsers(instance)
            .then(({ data }) => setUsers(data.filter(u => u.CODIGO > 0)))
            .catch((err) => toast.error("Falha ao buscar usuários: " + err.message));

        reportsService.getChatsReports(instance)
            .then((res) => {
                toast.success(res.message);
                setExports(res.data);
            })
    }, []);

    const onSuccessAction = useCallback(
        async (report: ChatReport, message: string) => {
            setExports(prev => [...prev, report]);
            toast.success(message);
        },
        [exports],
    );

    const onDeleteAction = useCallback(
        async (id: number, message: string) => {
            setExports(prev => prev.filter(e => e.id !== id));
        },
        [exports],
    );

    return (
        <div className="w-[75rem] mx-auto py-8 px-4 box-border">
            <ExportChatsForm users={users} onSuccessAction={onSuccessAction} />
            <div className="mx-auto my-8 w-[75rem]">
                <h2 className="my-6">Histórico de exportações</h2>
                <ExportChatsList exports={exports} onDelete={onDeleteAction} users={users} />
            </div>
        </div>
    );
}
