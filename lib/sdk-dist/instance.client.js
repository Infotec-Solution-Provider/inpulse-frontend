"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
/**
 * Classe InstanceSDK para interagir com a API de instâncias.
 */
class InstancesClient extends api_client_1.default {
    /**
     * Executa uma consulta na instância especificada.
     * @param {string} instance Nome da instância do Inpulse.
     * @param {string} query Consulta a ser executada.
     * @param {any[]} parameters Parâmetros da consulta.
     * @returns {Promise<T>} Resultado da consulta.
     */
    async executeQuery(instance, query, parameters) {
        const response = await this.ax
            .post(`/api/instances/${instance}/query`, { query, parameters })
            .catch((error) => {
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            if (error.response?.status) {
                throw new Error(`Failed to execute query, status: ${error.response.status}`);
            }
            throw new Error(error.message);
        });
        return response.data.result;
    }
}
exports.default = InstancesClient;
