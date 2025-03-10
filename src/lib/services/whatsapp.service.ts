import { DataResponse } from "@in.pulse-crm/types";
import Service from "./service";
import { ExportedChatInfo } from "../types/export-chats.types";
import { toast } from "react-toastify";

class WhatsappService extends Service {
    public async getExports(instance: string) {
        try {
            const { data } = await this.xhr.get<DataResponse<ExportedChatInfo[]>>(`/${instance}/tools/export-chats`);

            return data.data;
        } catch (err: any) {
            toast.error("Falha ao buscar exportações!\n" + err?.message);
            return [];
        }
    }

    public async deleteExport(instance: string, fileName: string) {
        try {
            await this.xhr.delete<DataResponse<ExportedChatInfo[]>>(`/${instance}/tools/export-chats/${fileName}`);
            toast.success("Exportação excluída com sucesso!");
            return true;
        } catch (err: any) {
            toast.error("Falha ao excluir exportação!\n" + err?.message);
            return false
        }
    }
}

export default new WhatsappService({
    baseURL: process.env["NEXT_PUBLIC_WHATS_URL"]!,
    timeout: 600000,
    headers: {
        authorization: `Bearer ${localStorage.getItem("@inpulse/token")}`,
    }
});