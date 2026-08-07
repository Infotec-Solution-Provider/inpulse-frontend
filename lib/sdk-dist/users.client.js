"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
/**
 * SDK para operações de usuários.
 */
class UsersClient extends api_client_1.default {
    /**
     * Obtém a lista de usuários.
     * @param filters - Filtros opcionais para a query.
     * @returns Uma resposta paginada contendo os usuários.
     */
    async getUsers(filters) {
        let baseUrl = `/api/users`;
        if (filters) {
            const params = new URLSearchParams(filters);
            baseUrl += `?${params.toString()}`;
        }
        const response = await this.ax.get(baseUrl);
        return response.data;
    }
    /**
     * Obtém um usuário pelo ID.
     * @param userId - O ID do usuário.
     * @returns Uma resposta contendo os dados do usuário.
     */
    async getUserById(userId) {
        const { data: res } = await this.ax.get(`/api/users/${userId}`);
        return res.data;
    }
    /**
     * Cria um novo usuário.
     * @param data - Os dados para criação do usuário.
     * @returns Uma resposta contendo os dados do usuário criado.
     * @throws Um erro se a criação do usuário falhar.
     */
    async createUser(data) {
        try {
            const { data: res } = await this.ax.post(`/api/users`, data);
            return res.data;
        }
        catch (error) {
            throw new Error("Failed to create user", { cause: error });
        }
    }
    /**
     * Atualiza um usuário existente.
     * @param userId - O ID do usuário.
     * @param data - Os dados para atualização do usuário.
     * @returns Uma resposta contendo os dados do usuário atualizado.
     * @throws Um erro se a atualização do usuário falhar.
     */
    async updateUser(userId, data) {
        try {
            const { data: res } = await this.ax.patch(`/api/users/${userId}`, data);
            return res.data;
        }
        catch (error) {
            throw new Error("Failed to update user", { cause: error });
        }
    }
    /**
     * Sets the authorization token for HTTP requests.
     *
     * @param token - The authentication token to be used in the `Authorization` header.
     */
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
}
exports.default = UsersClient;
