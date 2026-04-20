import ApiClient from "./api-client";
import { ReadyMessage, CreateReadyMessageDto, UpdateReadyMessageDto } from "./types/ready-messages.types";
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
export default class ReadyMessageClient extends ApiClient {
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
    createReadyMessage(data: CreateReadyMessageDto, file?: File | null): Promise<ReadyMessage>;
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
    getReadyMessages(): Promise<ReadyMessage[]>;
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
    updateReadyMessage(id: number, data: UpdateReadyMessageDto, file?: File): Promise<ReadyMessage>;
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
    deleteReadyMessage(id: number): Promise<void>;
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
    setAuth(token: string): void;
}
