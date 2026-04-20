import { PaginatedResponse } from "./types/response.types";
import { CreateUserDTO, UpdateUserDTO, User } from "./types/user.types";
import ApiClient from "./api-client";
import { RequestFilters } from "./types";
/**
 * SDK para operações de usuários.
 */
export default class UsersClient extends ApiClient {
    /**
     * Obtém a lista de usuários.
     * @param filters - Filtros opcionais para a query.
     * @returns Uma resposta paginada contendo os usuários.
     */
    getUsers(filters?: RequestFilters<User>): Promise<PaginatedResponse<User>>;
    /**
     * Obtém um usuário pelo ID.
     * @param userId - O ID do usuário.
     * @returns Uma resposta contendo os dados do usuário.
     */
    getUserById(userId: number): Promise<User>;
    /**
     * Cria um novo usuário.
     * @param data - Os dados para criação do usuário.
     * @returns Uma resposta contendo os dados do usuário criado.
     * @throws Um erro se a criação do usuário falhar.
     */
    createUser(data: CreateUserDTO): Promise<User>;
    /**
     * Atualiza um usuário existente.
     * @param userId - O ID do usuário.
     * @param data - Os dados para atualização do usuário.
     * @returns Uma resposta contendo os dados do usuário atualizado.
     * @throws Um erro se a atualização do usuário falhar.
     */
    updateUser(userId: string, data: UpdateUserDTO): Promise<User>;
    /**
     * Sets the authorization token for HTTP requests.
     *
     * @param token - The authentication token to be used in the `Authorization` header.
     */
    setAuth(token: string): void;
}
