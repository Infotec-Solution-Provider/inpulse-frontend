import { type File as StoredFile, FilesClient, type FileDirType } from "@in.pulse-crm/sdk";

const FILES_URL = process.env["NEXT_PUBLIC_FILES_URL"] || "http://localhost:8003";
const UPLOAD_TIMEOUT_MS = Number(
	process.env["NEXT_PUBLIC_UPLOAD_TIMEOUT_MS"] || "300000",
);

class FrontendFilesService extends FilesClient {
	public async uploadBrowserFile(props: {
		instance: string;
		dirType: FileDirType;
		file: File;
		contentHash?: string;
	}): Promise<StoredFile> {
		const form = new FormData();
		form.append("instance", props.instance);
		form.append("dirType", props.dirType);
		form.append("file", props.file);
		if (props.contentHash) {
			form.append("contentHash", props.contentHash);
		}

		const response = await this.ax.post<{ message: string; data: StoredFile }>(
			"/api/files",
			form,
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
				timeout: UPLOAD_TIMEOUT_MS,
				maxBodyLength: Infinity,
				maxContentLength: Infinity,
			},
		);

		return response.data.data;
	}
}

const filesService = new FrontendFilesService(FILES_URL);

export default filesService;
