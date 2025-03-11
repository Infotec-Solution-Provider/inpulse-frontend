"use client";
import AutoComplete from "@/lib/components/auto-complete";
import Input from "@/lib/components/input";
import Button from "@/lib/components/button";
import { FormEventHandler, useRef } from "react";
import axios from "axios";
import { FaFileDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import Select from "@/lib/components/select";
import { ExportedChatInfo } from "@/lib/types/export-chats.types";
import { User } from "@in.pulse-crm/types";

interface FormProps {
    users: Array<User>;
    onSuccessAction: () => void;
}

export default function ExportChatsForm({ users, onSuccessAction }: FormProps) {
    const formatOptions = {
        PDF: "pdf",
        CSV: "csv",
        TXT: "txt",
    };

    const userOptions = users.reduce(
        (o, u) => ({
            ...o,
            [u.NOME]: String(u.CODIGO),
        }),
        { Todos: "*" },
    );

    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        const instance = location.pathname.split("/")[1];
        const formData = new FormData(formRef.current!);
        const data = Object.fromEntries(formData.entries());

        const request = axios
            .post<ExportedChatInfo>(`${process.env["NEXT_PUBLIC_WHATS_URL"]}/${instance}/tools/export-chats`, data)
            .then((res) => {
                onSuccessAction()
            });

        await toast.promise(request, {
            pending: "Exportando conversas...",
            success: "Conversas exportadas com sucesso!",
            error: "Falha ao exportar conversas!",
        });
    };

    return (
        <form
            className="flex items-center gap-3 px-4 py-4 text-xs border border-slate-400 rounded-lg shadow-md"
            onSubmit={handleSubmit}
            ref={formRef}
        >
            <Select
                title="Formato"
                name="format"
                options={formatOptions}
                width="12rem"
                required
            />
            <AutoComplete
                title="Usuário"
                name="userId"
                options={userOptions}
                required
            />
            <Input title="Data Inicial" name="startDate" type="date" required />
            <Input title="Data Final" name="endDate" type="date" required />
            <div className="ml-auto">
                <Button title="Exportar" type="submit">
                    <FaFileDownload className="my-1 text-base text-amber-100 group-hover:text-amber-300" />
                </Button>
            </div>
        </form>
    );
}
