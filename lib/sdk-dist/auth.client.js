"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@in.pulse-crm/utils");
const api_client_1 = __importDefault(require("./api-client"));
/**
 * Classe AuthSDK para interagir com a API de autenticação.
 */
class AuthClient extends api_client_1.default {
    /**
     * Realiza o login do usuário.
     * @param instance Nome da instância do Inpulse.
     * @param username Nome de usuário.
     * @param password Senha do usuário.
     * @returns  Dados de login.
     */
    async login(instance, username, password) {
        const { data: res } = await this.ax.post(`/api/auth/login`, { LOGIN: username, SENHA: password, instance });
        return res.data;
    }
    /**
     * Busca os dados da sessão.
     * @param authToken Token de autenticação.
     * @returns Dados da sessão.
     */
    async fetchSessionData(authToken) {
        const { data: res } = await this.ax
            .get(`/api/auth/session`, {
            headers: {
                authorization: authToken,
            },
        })
            .catch((error) => {
            const message = (0, utils_1.sanitizeErrorMessage)(error);
            throw new Error("Failed to fetch session data! " + message);
        });
        return res.data;
    }
    /**
     * Verifica se o usuário está autenticado.
     * @param instanceName Nome da instância do Inpulse.
     * @param authToken Token de autenticação.
     * @returns Verdadeiro se o usuário estiver autenticado, falso caso contrário.
     */
    async isAuthenticated(instanceName, authToken) {
        try {
            const session = await this.fetchSessionData(authToken);
            return !!session.userId && session.instance === instanceName;
        }
        catch {
            return false;
        }
    }
    /**
     * Verifica se o usuário está autorizado.
     * @param instanceName Nome da instância do Inpulse.
     * @param authToken Token de autenticação.
     * @param authorizedRoles Lista de papéis autorizados.
     * @returns Verdadeiro se o usuário estiver autorizado, falso caso contrário.
     */
    async isAuthorized(instanceName, authToken, authorizedRoles) {
        try {
            const session = await this.fetchSessionData(authToken);
            return (authorizedRoles.includes(session.role) &&
                session.instance === instanceName);
        }
        catch {
            return false;
        }
    }
    async getOnlineSessions(instance) {
        const { data: res } = await this.ax.get("/api/online-sessions", {
            params: {
                instance,
            },
        });
        return res.data;
    }
    async initOnlineSession(authToken) {
        await this.ax.post("/api/online-sessions", {}, {
            headers: {
                Authorization: authToken,
            },
        });
    }
    async finishOnlineSession(authToken) {
        await this.ax.delete("/api/online-sessions", {
            headers: {
                Authorization: authToken,
            },
        });
    }
}
exports.default = AuthClient;
