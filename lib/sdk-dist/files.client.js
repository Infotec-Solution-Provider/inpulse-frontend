"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_data_1 = __importDefault(require("form-data"));
const api_client_1 = __importDefault(require("./api-client"));
class FilesClient extends api_client_1.default {
    /**
     * Busca um arquivo pelo ID.
     * @param {number} id - ID do arquivo.
     * @returns {Promise<Buffer>} Um buffer contendo os dados do arquivo.
     */
    async fetchFile(id) {
        const response = await this.ax.get(`/api/files/${id}`, {
            responseType: "arraybuffer",
        });
        const buffer = Buffer.from(response.data, "binary");
        return buffer;
    }
    /**
     * Fetches the metadata of a file by its ID.
     *
     * @param id - The unique identifier of the file.
     * @returns A promise that resolves to the file metadata.
     * @throws Will throw an error if the HTTP request fails.
     */
    async fetchFileMetadata(id) {
        const { data: res } = await this.ax.get(`/api/files/${id}/metadata`);
        return res.data;
    }
    /**
     * Obtém a URL de download de um arquivo.
     * @param {number} id - ID do arquivo.
     * @returns {string} URL de download do arquivo.
     */
    getFileDownloadUrl(id, baseUrl) {
        return (baseUrl || this.ax.defaults.baseURL) + `/api/files/${id}`;
    }
    async getFileByHash(instance, hash) {
        const { data: res } = await this.ax.get(`/api/files/exists?instance=${instance}&hash=${hash}`);
        return res.data;
    }
    /**
     * Faz o upload de um arquivo.
     * @param {UploadFileOptions} props - Opções para o upload do arquivo.
     * @returns {Promise<File>} Os dados do arquivo enviado.
     */
    async uploadFile(props) {
        // Node: use 'form-data' (evita conflito de tipos com Blob)
        const form = new form_data_1.default();
        form.append("instance", props.instance);
        form.append("dirType", props.dirType);
        form.append("file", props.buffer, {
            filename: props.fileName,
            contentType: props.mimeType,
        });
        const response = await this.ax.post("/api/files", form, {
            // deixe o boundary correto
            headers: form.getHeaders(),
        });
        return response.data.data;
    }
    /**
     * Deleta um arquivo pelo ID.
     * @param {number} id - ID do arquivo.
     * @returns {Promise<void>}
     */
    async deleteFile(id) {
        await this.ax.delete(`/api/files/${id}`);
    }
    async uploadWabaMedia(instance, wabaMediaId) {
        const response = await this.ax.post(`/api/waba`, { instance, wabaMediaId });
        return response.data.data;
    }
}
exports.default = FilesClient;
