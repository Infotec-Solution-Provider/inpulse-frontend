import ApiClient from "./api-client";
import { Wallet } from "./types/wallet.types";
export default class WalletsClient extends ApiClient {
    createWallet(name: string): Promise<Wallet>;
    deleteWallet(walletId: number): Promise<Wallet>;
    updateWalletName(id: number, newName: string): Promise<Wallet>;
    addUserToWallet(walletId: number, userId: number): Promise<Wallet>;
    removeUserFromWallet(walletId: number, userId: number): Promise<Wallet>;
    getWallets(): Promise<Wallet[]>;
    getWalletById(walletId: number): Promise<Wallet>;
    getWalletUsers(walletId: number): Promise<Wallet>;
    getUserInWallet(walletId: number, userId: number): Promise<Wallet>;
    getUserWallets(instance: string, userId: number): Promise<Wallet[]>;
    setAuth(token: string): void;
}
