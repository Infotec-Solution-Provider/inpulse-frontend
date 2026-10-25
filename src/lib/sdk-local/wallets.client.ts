import type { AxiosRequestConfig } from "axios";
import { authSession } from "../auth-session";
import { DataResponse } from "./types/response.types";
import ApiClient from "./api-client";
import { Wallet } from "./types/wallet.types";

export default class WalletsClient extends ApiClient {
    private async config(): Promise<AxiosRequestConfig & { skipAuthInjection: true; skipAuthRefresh: true }> {
        const token = await authSession.tokenForRequest();
        if (!token) throw new Error("Sua sessão expirou. Entre novamente.");
        return { headers: { Authorization: `Bearer ${token}` }, skipAuthInjection: true, skipAuthRefresh: true };
    }
    async createWallet(name: string) {
        return (await this.ax.post<DataResponse<Wallet>>("/api/wallets", { name }, await this.config())).data.data;
    }
    async deleteWallet(id: number, version: string) {
        return (await this.ax.delete<DataResponse<Wallet>>(`/api/wallets/${id}`, { ...await this.config(), data: { version } })).data.data;
    }
    async updateWalletName(id: number, newName: string, version: string) {
        return (await this.ax.put<DataResponse<Wallet>>(`/api/wallets/${id}/name`, { newName, version }, await this.config())).data.data;
    }
    async addUserToWallet(id: number, userId: number) {
        return (await this.ax.post<DataResponse<Wallet>>(`/api/wallets/${id}/users`, { userId }, await this.config())).data.data;
    }
    async removeUserFromWallet(id: number, userId: number) {
        return (await this.ax.delete<DataResponse<Wallet>>(`/api/wallets/${id}/users/${userId}`, await this.config())).data.data;
    }
    async getWallets() {
        const config = await this.config();
        const wallets: Wallet[] = [];
        let after: number | null = null;
        do {
            const response: { data: DataResponse<Wallet[]> & { nextCursor: number | null } } = await this.ax.get(
                "/api/wallets/manage", { ...config, params: after === null ? {} : { after } }
            );
            wallets.push(...response.data.data);
            const next = response.data.nextCursor;
            if (next !== null && (!Number.isSafeInteger(next) || next <= (after ?? 0))) throw new Error("Paginação de carteiras inválida.");
            after = next;
        } while (after !== null);
        return wallets;
    }
    async getWalletById(id: number) {
        return (await this.ax.get<DataResponse<Wallet>>(`/api/wallets/${id}`, await this.config())).data.data;
    }
    async getWalletUsers(id: number) {
        return (await this.ax.get<DataResponse<number[]>>(`/api/wallets/${id}/users`, await this.config())).data.data;
    }
    async getUserInWallet(id: number, userId: number) {
        return (await this.getWalletUsers(id)).includes(userId);
    }
    async getUserWallets(instance: string, userId: number) {
        return (await this.ax.get<DataResponse<Wallet[]>>("/api/wallets", { ...await this.config(), params: { instance, userId } })).data.data;
    }
    setAuth(token: string) { this.ax.defaults.headers.common["Authorization"] = `Bearer ${token}`; }
}
