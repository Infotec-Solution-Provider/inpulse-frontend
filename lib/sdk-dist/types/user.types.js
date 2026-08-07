"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
/**
 * Enum que representa os diferentes papéis de usuário dentro do sistema.
 *
 * @enum {string}
 * @property {string} ADMIN - Representa um papel de administrador.
 * @property {string} ACTIVE - Representa um papel de usuário ativo.
 * @property {string} RECEPTIONIST - Representa um papel de recepcionista.
 * @property {string} BOTH - Representa um papel que combina tanto recepcionista quanto usuário ativo.
 */
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["ACTIVE"] = "ATIVO";
    UserRole["RECEPTIONIST"] = "RECEP";
    UserRole["BOTH"] = "AMBOS";
})(UserRole || (exports.UserRole = UserRole = {}));
