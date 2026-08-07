"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
class WalletsClient extends api_client_1.default {
    async createWallet(name) {
        try {
            const response = await this.ax.post(`/api/wallets`, { name });
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to create wallet", { cause: error });
        }
    }
    async deleteWallet(walletId) {
        try {
            const response = await this.ax.delete(`/api/wallets/${walletId}`);
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to delete wallet", { cause: error });
        }
    }
    async updateWalletName(id, newName) {
        try {
            const response = await this.ax.put(`/api/wallets/${id}/name`, { newName });
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to update wallet name", { cause: error });
        }
    }
    async addUserToWallet(walletId, userId) {
        try {
            const response = await this.ax.post(`/api/wallets/${walletId}/users`, { userId });
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to add user to wallet", { cause: error });
        }
    }
    async removeUserFromWallet(walletId, userId) {
        try {
            const response = await this.ax.delete(`/api/wallets/${walletId}/users/${userId}`);
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to remove user from wallet", { cause: error });
        }
    }
    async getWallets() {
        try {
            const response = await this.ax.get("/api/wallets");
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to get wallets list", { cause: error });
        }
    }
    async getWalletById(walletId) {
        try {
            const response = await this.ax.get(`/api/wallets/${walletId}`);
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to get wallet", { cause: error });
        }
    }
    async getWalletUsers(walletId) {
        try {
            const response = await this.ax.get(`/api/wallets/${walletId}/users`);
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to get wallet users list", { cause: error });
        }
    }
    async getUserInWallet(walletId, userId) {
        try {
            const response = await this.ax.get(`/api/wallets/${walletId}/users/${userId}`);
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to get user from wallet", { cause: error });
        }
    }
    async getUserWallets(instance, userId) {
        try {
            const response = await this.ax.get(`/api/users/${userId}/wallets`, { params: { instance } });
            return response.data.data;
        }
        catch (error) {
            throw new Error("Failed to get user wallets list", { cause: error });
        }
    }
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] =
            `Bearer ${token}`;
    }
}
exports.default = WalletsClient;
