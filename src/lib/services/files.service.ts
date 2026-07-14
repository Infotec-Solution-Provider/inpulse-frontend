import { type File as StoredFile, FilesClient, type FileDirType } from "@in.pulse-crm/sdk";
import { logFileUploadTrace, logFileUploadTraceError } from "../utils/file-upload-trace";

const FILES_URL = process.env["NEXT_PUBLIC_FILES_URL"] || "http://localhost:8003";
const UPLOAD_TIMEOUT_MS = Number(
	process.env["NEXT_PUBLIC_UPLOAD_TIMEOUT_MS"] || "300000",
);
const UPLOAD_CHUNK_SIZE_BYTES = Number(
	process.env["NEXT_PUBLIC_UPLOAD_CHUNK_SIZE_BYTES"] || String(5 * 1024 * 1024),
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
		const totalChunks = Math.max(
			1,
			Math.ceil(props.file.size / UPLOAD_CHUNK_SIZE_BYTES),
		);

		props.traceId && logFileUploadTrace(props.traceId, "frontend.files-service.upload.start", {
			instance: props.instance,
			dirType: props.dirType,
			fileName: props.file.name,
			fileSize: props.file.size,
			fileType: props.file.type,
			totalChunks,
			chunkSize: UPLOAD_CHUNK_SIZE_BYTES,
			hasContentHash: !!props.contentHash,
		});

		try {
			const initResponse = await this.ax.post<{
				message: string;
				data: { uploadId: string };
			}>(
				"/api/files/chunks/init",
				{
					instance: props.instance,
					dirType: props.dirType,
					fileName: props.file.name,
					fileType: props.file.type,
					totalSize: props.file.size,
					totalChunks,
					...(props.contentHash ? { contentHash: props.contentHash } : {}),
					...(props.traceId ? { traceId: props.traceId } : {}),
				},
				{
					headers: {
						...(props.traceId ? { "x-upload-trace-id": props.traceId } : {}),
					},
					timeout: UPLOAD_TIMEOUT_MS,
				},
			);

			const uploadId = initResponse.data.data.uploadId;

			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				const start = chunkIndex * UPLOAD_CHUNK_SIZE_BYTES;
				const end = Math.min(start + UPLOAD_CHUNK_SIZE_BYTES, props.file.size);
				const chunk = props.file.slice(start, end);
				const chunkForm = new FormData();
				chunkForm.append("chunk", chunk, props.file.name);
				chunkForm.append("chunkIndex", String(chunkIndex));
				chunkForm.append("totalChunks", String(totalChunks));

				if (props.traceId) {
					chunkForm.append("traceId", props.traceId);
				}

				await this.ax.post(`/api/files/chunks/${uploadId}`, chunkForm, {
					headers: {
						"Content-Type": "multipart/form-data",
						...(props.traceId ? { "x-upload-trace-id": props.traceId } : {}),
					},
					timeout: UPLOAD_TIMEOUT_MS,
					maxBodyLength: Infinity,
					maxContentLength: Infinity,
				});

				props.traceId && logFileUploadTrace(props.traceId, "frontend.files-service.upload.chunk.success", {
					uploadId,
					chunkIndex,
					totalChunks,
					chunkSize: chunk.size,
				});
			}

			const response = await this.ax.post<{ message: string; data: StoredFile }>(
				`/api/files/chunks/${uploadId}/complete`,
				props.traceId ? { traceId: props.traceId } : {},
				{
					headers: {
						...(props.traceId ? { "x-upload-trace-id": props.traceId } : {}),
					},
					timeout: UPLOAD_TIMEOUT_MS,
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
