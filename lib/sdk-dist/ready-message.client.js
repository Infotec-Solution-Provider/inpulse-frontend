"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
const form_data_1 = __importDefault(require("form-data"));
/**
 * Client para gerenciar mensagens prontas (templates de mensagens)
 *
 * @example
 * ```typescript
 * const client = new ReadyMessageClient(baseURL);
 * client.setAuth(token);
 *
 * // Criar mensagem pronta
 * const message = await client.createReadyMessage({
 *   title: "Boas-vindas",
 *   message: "Olá! Como posso ajudar?",
 *   sectorId: 10,
 *   onlyAdmin: false
 * });
 *
 * // Listar mensagens
 * const messages = await client.getReadyMessages();
 * ```
 */
class ReadyMessageClient extends api_client_1.default {
    /**
     * Cria uma nova mensagem pronta
     *
     * @param data - Dados da mensagem (title, message, sectorId, onlyAdmin)
     * @param file - Arquivo opcional para anexar à mensagem
     * @returns A mensagem pronta criada
     *
     * @example
     * ```typescript
     * const message = await client.createReadyMessage({
     *   title: "Horário de Atendimento",
     *   message: "Nosso horário é de 8h às 18h",
     *   sectorId: 10
     * }, fileObject);
     * ```
     */
    async createReadyMessage(data, file = null) {
        const form = new form_data_1.default();
        if (file) {
            form.append("file", file);
        }
        form.append("data", JSON.stringify(data));
        const { data: res } = await this.ax.post(`/api/ready-messages`, form, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    }
    /**
     * Lista todas as mensagens prontas do setor do usuário
     *
     * Nota: Se o usuário for do setor TI (setor 3), retorna mensagens de todos os setores
     *
     * @returns Array de mensagens prontas
     *
     * @example
     * ```typescript
     * const messages = await client.getReadyMessages();
     * console.log(`Encontradas ${messages.length} mensagens`);
     * ```
     */
    async getReadyMessages() {
        const url = `/api/ready-messages`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    /**
     * Atualiza uma mensagem pronta existente
     *
     * @param id - ID da mensagem pronta
     * @param data - Dados para atualizar (campos opcionais)
     * @param file - Novo arquivo opcional
     * @returns A mensagem pronta atualizada
     *
     * @example
     * ```typescript
     * const updated = await client.updateReadyMessage(
     *   123,
     *   { title: "Novo Título" },
     *   newFile
     * );
     * ```
     */
    async updateReadyMessage(id, data, file) {
        const formData = new form_data_1.default();
        if (file) {
            formData.append("file", file);
        }
        // Converter para o formato que o backend espera (UPPERCASE)
        const backendData = {};
        if (data.title !== undefined)
            backendData.TITULO = data.title;
        if (data.message !== undefined)
            backendData.TEXTO_MENSAGEM = data.message;
        if (data.onlyAdmin !== undefined)
            backendData.APENAS_ADMIN = data.onlyAdmin;
        formData.append("data", JSON.stringify(backendData));
        const { data: res } = await this.ax.put(`/api/ready-messages/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    }
    /**
     * Deleta uma mensagem pronta
     *
     * @param id - ID da mensagem pronta a ser deletada
     *
     * @example
     * ```typescript
     * await client.deleteReadyMessage(123);
     * console.log("Mensagem deletada com sucesso!");
     * ```
     */
    async deleteReadyMessage(id) {
        const url = `/api/ready-messages/${id}`;
        await this.ax.delete(url);
    }
    /**
     * Define o token de autenticação para as requisições
     *
     * @param token - Token JWT de autenticação
     *
     * @example
     * ```typescript
     * client.setAuth("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
     * ```
     */
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
}
exports.default = ReadyMessageClient;
