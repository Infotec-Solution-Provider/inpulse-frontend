import ApiClient from "./api-client";
import { File, FileExistsByHashResponse, UploadFileOptions } from "./types/files.types";
declare class FilesClient extends ApiClient {
    /**
     * Busca um arquivo pelo ID.
     * @param {number} id - ID do arquivo.
     * @returns {Promise<Buffer>} Um buffer contendo os dados do arquivo.
     */
    fetchFile(id: number): Promise<Buffer>;
    /**
     * Fetches the metadata of a file by its ID.
     *
     * @param id - The unique identifier of the file.
     * @returns A promise that resolves to the file metadata.
     * @throws Will throw an error if the HTTP request fails.
     */
    fetchFileMetadata(id: number): Promise<File>;
    /**
     * Obtém a URL de download de um arquivo.
     * @param {number} id - ID do arquivo.
     * @returns {string} URL de download do arquivo.
     */
    getFileDownloadUrl(id: number, baseUrl?: string): string;
    getFileByHash(instance: string, hash: string): Promise<FileExistsByHashResponse["data"]>;
    /**
     * Faz o upload de um arquivo.
     * @param {UploadFileOptions} props - Opções para o upload do arquivo.
     * @returns {Promise<File>} Os dados do arquivo enviado.
     */
    uploadFile(props: UploadFileOptions): Promise<File>;
    /**
     * Deleta um arquivo pelo ID.
     * @param {number} id - ID do arquivo.
     * @returns {Promise<void>}
     */
    deleteFile(id: number): Promise<void>;
    uploadWabaMedia(instance: string, wabaMediaId: string): Promise<File>;
}
export default FilesClient;
