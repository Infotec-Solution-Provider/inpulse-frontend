import ApiClient from "./api-client";
import { LoginData, SessionData, UserOnlineSession } from "./types/auth.types";
/**
 * Classe AuthSDK para interagir com a API de autenticação.
 */
export default class AuthClient extends ApiClient {
    /**
     * Realiza o login do usuário.
     * @param instance Nome da instância do Inpulse.
     * @param username Nome de usuário.
     * @param password Senha do usuário.
     * @returns  Dados de login.
     */
    login(instance: string, username: string, password: string): Promise<LoginData>;
    /**
     * Busca os dados da sessão.
     * @param authToken Token de autenticação.
     * @returns Dados da sessão.
     */
    fetchSessionData(authToken: string): Promise<SessionData>;
    /**
     * Verifica se o usuário está autenticado.
     * @param instanceName Nome da instância do Inpulse.
     * @param authToken Token de autenticação.
     * @returns Verdadeiro se o usuário estiver autenticado, falso caso contrário.
     */
    isAuthenticated(instanceName: string, authToken: string): Promise<boolean>;
    /**
     * Verifica se o usuário está autorizado.
     * @param instanceName Nome da instância do Inpulse.
     * @param authToken Token de autenticação.
     * @param authorizedRoles Lista de papéis autorizados.
     * @returns Verdadeiro se o usuário estiver autorizado, falso caso contrário.
     */
    isAuthorized(instanceName: string, authToken: string, authorizedRoles: string[]): Promise<boolean>;
    getOnlineSessions(instance: string): Promise<UserOnlineSession[]>;
    initOnlineSession(authToken: string): Promise<void>;
    finishOnlineSession(authToken: string): Promise<void>;
}
