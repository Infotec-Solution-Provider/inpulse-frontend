"use client";
import AutoComplete from "@/lib/components/auto-complete";
import Input from "@/lib/components/input";
import Button from "@/lib/components/button";
import { FormEventHandler, useCallback, useContext, useMemo, useRef, useState } from "react";
import { FaFileDownload } from "react-icons/fa";
import Select from "@/lib/components/select";
import { ChatsReportContext, GenerateReportParams } from "./context";
import { ChatsReportFileFormat } from "@in.pulse-crm/sdk";

export default function ChatReportForm() {
    const { users, generateReport } = useContext(ChatsReportContext);

    const [formData, setFormData] = useState<GenerateReportParams>({
        format: "pdf",
        userId: "*",
        startDate: "",
        endDate: "",
    });

    const formatOptions = useMemo(() => {
        return { PDF: "pdf", CSV: "csv", TXT: "txt", };
    }, []);

    const userOptions = useMemo(() => {
        return users.reduce(
            (o, u) => ({ ...o, [u.NOME]: String(u.CODIGO) }),
            { Todos: "*" },
        );
    }, [users]);

    const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(async (e) => {
        e.preventDefault();
        generateReport(formData);
    }, [formData]);

    return (
        <form
            className="flex items-center gap-3 px-4 py-4 text-xs shadow-md bg-indigo-700 bg-opacity-5"
            onSubmit={handleSubmit}
        >
            <Select
                placeholder="Formato"
                name="format"
                options={formatOptions}
                size="sm"
                required
                onChange={(v) => setFormData({ ...formData, format: v as ChatsReportFileFormat })}
            />
            <AutoComplete
                placeholder="Usuários"
                name="userId"
                options={userOptions}
                required
                onChange={(value) => setFormData({ ...formData, userId: value || "*" })}
            />
            <Input
                title="De"
                name="startDate"
                type="date"
                required
                onChange={(value) => setFormData({ ...formData, startDate: value })}
            />
            <Input
                title="Até"
                name="endDate"
                type="date"
                required
                onChange={(value) => setFormData({ ...formData, endDate: value })}
            />
            <div className="ml-auto">
                <Button title="Exportar" type="submit" color="indigo-dark">
                    <FaFileDownload className="my-1 text-base pointer-events-none" />
                </Button>
            </div>
        </form>
    );
}
