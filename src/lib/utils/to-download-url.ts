import { SavedMessageWithFile } from "@/lib/types/messages.types";

export default function toDownloadUrl(message: SavedMessageWithFile, instance: string) {
	const baseUrl = `${process.env["API_URL"] || "http://localhost:8000"}/api/${instance}`;

	return `${baseUrl}/custom-routes/file/${message.ARQUIVO_NOME}`;
}
