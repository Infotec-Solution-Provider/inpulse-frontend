"use client"
import { WppWallet } from "@in.pulse-crm/sdk";
import walletsService from "@/lib/services/wallets.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify";

interface IWalletsProviderProps {
    children: ReactNode;
}

interface IWalletsContext {
    wallets: WppWallet[]
    createWallet: (instance: string, userId: number, name: string) => Promise<void>
    deleteWallet: (walletId: number) => Promise<void>
    updateWalletName: (id: number, newName: string) => Promise<void>
    getWalletUsers: (walletId: number) => Promise<number[]>
    getUserWallets: (instance: string, userId: number) => Promise<WppWallet[]>
    addUsersToWallet: (walletId: number, userIds: number[]) => Promise<void>
    removeUsersFromWallet: (walletId: number, userIds: number[]) => Promise<void>
    loading: boolean
    order: "desc" | "asc"
    orderBy: keyof WppWallet
    sortedWallets: WppWallet[]
    handleSort: (property: keyof WppWallet) => void
}

export const WalletsContext = createContext<IWalletsContext>({} as IWalletsContext);

export default function WalletsProvider({ children }: IWalletsProviderProps) {
    const [wallets, setWallets] = useState<WppWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderBy, setOrderBy] = useState<keyof WppWallet>('id');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        const loadWallets = async () => {
            try {
                setLoading(true);
                const data = await walletsService.getWallets();
                setWallets(data);
            } catch (err) {
                toast.error(`Falha ao carregar as carteiras: ${sanitizeErrorMessage(err)}`);
            } finally {
                setLoading(false);
            }
        };
        loadWallets();
    }, []);

    const sortedWallets = useMemo(() => {
        return [...wallets].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (aValue === bValue) return 0;
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return order === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return order === 'asc'
                ? Number(aValue) - Number(bValue)
                : Number(bValue) - Number(aValue);
        });
    }, [wallets, order, orderBy]);
    const handleSort = (property: keyof WppWallet) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const createWallet = useCallback(async (instance: string, userId: number, name: string) => {
        try {
            setLoading(true);
            const newWallet = await walletsService.createWallet(instance, userId, name);
            setWallets(prev => [newWallet, ...prev]);
            toast.success("Carteira criada com sucesso!");
        } catch (err) {
            toast.error(`Falha ao criar a carteira: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteWallet = useCallback(async (walletId: number) => {
        try {
            setLoading(true);
            await walletsService.deleteWallet(walletId);
            setWallets(prev => prev.filter(wallet => wallet.id !== walletId));
            toast.success("Carteira excluida com sucesso!");
        } catch (err) {
            toast.error(`Falha ao excluir carteira: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateWalletName = useCallback(async (id: number, newName: string) => {
        try {
            setLoading(true);
            const updatedWallet = await walletsService.updateWalletName(id, newName);
            setWallets(prev =>
                prev.map(wallet =>
                    wallet.id === id ? { ...wallet, name: newName } : wallet
                )
            );
            toast.success("Carteira atualizada!");
        } catch (err) {
            toast.error(`Falha ao atualizar carteira: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const getWalletUsers = useCallback(async (walletId: number) => {
        try {
            setLoading(true);
            return await walletsService.getWalletUsers(walletId);
        } catch (err) {
            toast.error(`Falha ao buscar usuários: ${sanitizeErrorMessage(err)}`);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const getUserWallets = useCallback(async (instance: string, userId: number) => {
        try {
            setLoading(true);
            return await walletsService.getUserWallets(instance, userId);
        } catch (err) {
            toast.error(`Falha ao buscar carteiras do usuário: ${sanitizeErrorMessage(err)}`);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addUsersToWallet = useCallback(async (walletId: number, userIds: number[]) => {
        try {
            setLoading(true);
            const updatedWallet = await walletsService.addUsersToWallet(walletId, userIds);
            setWallets(prev =>
                prev.map(wallet =>
                    wallet.id === walletId
                        ? { ...wallet, userIds: [...wallet.userIds, ...userIds] }
                        : wallet
                )
            );
            toast.success("Usuários adicionados com sucesso!");
        } catch (err) {
            toast.error(`Falha ao adicionar usuários: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const removeUsersFromWallet = useCallback(async (walletId: number, userIds: number[]) => {
        try {
            setLoading(true);
            await walletsService.removeUsersFromWallet(walletId, userIds);
            setWallets(prev =>
                prev.map(wallet =>
                    wallet.id === walletId
                        ? {
                            ...wallet,
                            userIds: wallet.userIds.filter(id => !userIds.includes(id))
                        }
                        : wallet
                )
            );
            toast.success("Usuários removidos com sucesso!");
        } catch (err) {
            toast.error(`Falha ao remover usuários: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <WalletsContext.Provider value={{
            wallets,
            createWallet,
            deleteWallet,
            updateWalletName,
            getWalletUsers,
            getUserWallets,
            addUsersToWallet,
            removeUsersFromWallet,
            loading,
            order,
            orderBy,
            sortedWallets,
            handleSort,
        }}>
            {children}
        </WalletsContext.Provider>
    )
}