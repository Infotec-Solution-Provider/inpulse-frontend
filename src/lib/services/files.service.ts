import { type File as StoredFile, FilesClient, type FileDirType } from "@in.pulse-crm/sdk";

const FILES_URL = process.env["NEXT_PUBLIC_FILES_URL"] || "http://localhost:8003";

class FrontendFilesService extends FilesClient {
	public async uploadBrowserFile(props: {
		instance: string;
		dirType: FileDirType;
		file: File;
	}): Promise<StoredFile> {
		const form = new FormData();
		form.append("instance", props.instance);
		form.append("dirType", props.dirType);
		form.append("file", props.file);

		const response = await this.ax.post<{ message: string; data: StoredFile }>("/api/files", form);

		return response.data.data;
	}
}

const filesService = new FrontendFilesService(FILES_URL);

export default filesService;
