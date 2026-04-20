import ApiClient from "./api-client";
/**
 * Classe InstanceSDK para interagir com a API de instâncias.
 */
declare class InstancesClient extends ApiClient {
    /**
     * Executa uma consulta na instância especificada.
     * @param {string} instance Nome da instância do Inpulse.
     * @param {string} query Consulta a ser executada.
     * @param {any[]} parameters Parâmetros da consulta.
     * @returns {Promise<T>} Resultado da consulta.
     */
    executeQuery<T>(instance: string, query: string, parameters: any[]): Promise<T>;
}
export default InstancesClient;
