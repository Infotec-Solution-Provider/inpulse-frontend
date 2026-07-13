import { type File as StoredFile, FilesClient, type FileDirType } from "@in.pulse-crm/sdk";
import { logFileUploadTrace, logFileUploadTraceError } from "../utils/file-upload-trace";

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
		traceId?: string;
	}): Promise<StoredFile> {
		const startedAt = Date.now();
		const form = new FormData();
		form.append("instance", props.instance);
		form.append("dirType", props.dirType);
		form.append("file", props.file);
		if (props.contentHash) {
			form.append("contentHash", props.contentHash);
		}
		if (props.traceId) {
			form.append("traceId", props.traceId);
		}

		props.traceId && logFileUploadTrace(props.traceId, "frontend.files-service.upload.start", {
			instance: props.instance,
			dirType: props.dirType,
			fileName: props.file.name,
			fileSize: props.file.size,
			fileType: props.file.type,
			hasContentHash: !!props.contentHash,
		});

		try {
			const response = await this.ax.post<{ message: string; data: StoredFile }>(
				"/api/files",
				form,
				{
					headers: {
						"Content-Type": "multipart/form-data",
						...(props.traceId ? { "x-upload-trace-id": props.traceId } : {}),
					},
					timeout: UPLOAD_TIMEOUT_MS,
					maxBodyLength: Infinity,
					maxContentLength: Infinity,
				},
			);

			props.traceId && logFileUploadTrace(props.traceId, "frontend.files-service.upload.success", {
				elapsedMs: Date.now() - startedAt,
				status: response.status,
				storedFileId: response.data.data.id,
				storedFileSize: response.data.data.size,
			});

			return response.data.data;
		} catch (error) {
			props.traceId && logFileUploadTraceError(props.traceId, "frontend.files-service.upload.error", error, {
				elapsedMs: Date.now() - startedAt,
				instance: props.instance,
				fileName: props.file.name,
				fileSize: props.file.size,
			});
			throw error;
		}
	}
}

const filesService = new FrontendFilesService(FILES_URL);

export default filesService;
