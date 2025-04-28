"use client"
import { useAuthContext } from "@/app/auth-context";
import { WalletsClient, WppWallet } from "@in.pulse-crm/sdk";
// import walletsService from "@/lib/services/wallets.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify";

interface IWalletsProviderProps {
    children: ReactNode;
}

interface IWalletsContext {
    walletsApi: React.RefObject<WalletsClient>;
    wallets: WppWallet[]
    createWallet: (name: string) => Promise<boolean>
    deleteWallet: (walletId: number) => Promise<void>
    updateWalletName: (id: number, newName: string) => Promise<void>
    getWalletUsers: (walletId: number) => Promise<number[]>
    getUserWallets: (instance: string, userId: number) => Promise<WppWallet[]>
    addUserToWallet: (userId: number) => Promise<void>
    removeUserFromWallet: (userId: number) => Promise<void>
    loading: boolean
    order: "desc" | "asc"
    orderBy: keyof WppWallet
    sortedWallets: WppWallet[]
    handleSort: (property: keyof WppWallet) => void
    selectedWallet: WppWallet | null
    setSelectedWallet: (wallet: WppWallet | null) => void
    walletUsers: number[]
    loadWalletUsers: () => Promise<void>
}

const WALLETS_URL = process.env["NEXT_PUBLIC_WALLETS_URL"] || "http://localhost:8005";

export const WalletsContext = createContext<IWalletsContext>({} as IWalletsContext);

export default function WalletsProvider({ children }: IWalletsProviderProps) {
    const { token } = useAuthContext();
    const [wallets, setWallets] = useState<WppWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderBy, setOrderBy] = useState<keyof WppWallet>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedWallet, setSelectedWallet] = useState<WppWallet | null>(null);
    const [walletUsers, setWalletUsers] = useState<number[]>([]);
    const api = useRef(new WalletsClient(WALLETS_URL));

    useEffect(() => {
        if (token) {
            api.current.setAuth(token)
            const loadWallets = async () => {
                try {
                    setLoading(true);
                    const data = await api.current.getWallets();
                    setWallets(data);
                } catch (err) {
                    toast.error(`Falha ao carregar as carteiras: ${sanitizeErrorMessage(err)}`);
                } finally {
                    setLoading(false);
                }
            };
            loadWallets();
        }
    }, [token]);

    const sortedWallets = useMemo(() => {
        return [...wallets].sort((a, b) => {
            if (orderBy === 'userIds') {
                const aLength = a.userIds?.length || 0;
                const bLength = b.userIds?.length || 0;
                return order === 'asc' ? aLength - bLength : bLength - aLength;
            }
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

    const createWallet = useCallback(async (name: string) => {
        try {
            setLoading(true);
            const newWallet = await api.current.createWallet(name);
            setWallets(prev => [{
                ...newWallet,
                userIds: newWallet.userIds || []
            }, ...prev]);
            toast.success("Carteira criada com sucesso!");
            return true;
        } catch (err) {
            toast.error(`Falha ao criar carteira: ${sanitizeErrorMessage(err)}`);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteWallet = useCallback(async (walletId: number) => {
        try {
            setLoading(true);
            await api.current.deleteWallet(walletId);
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
            // const updatedWallet = await api.current.updateWalletName(id, newName);
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

    const getWalletUsers = useCallback(async (walletId: number): Promise<number[]> => {
        try {
            const response = await api.current.getWalletUsers(walletId);
            return Array.isArray(response) ? response : [];
        } catch (err) {
            toast.error(`Falha ao buscar usuários: ${sanitizeErrorMessage(err)}`);
            return [];
        }
    }, []);

    const getUserWallets = useCallback(async (instance: string, userId: number,) => {
        try {
            return (await api.current.getUserWallets(instance, userId));
        } catch (err) {
            toast.error(`Falha ao buscar carteiras do usuário: ${sanitizeErrorMessage(err)}`);
            return []
        }
    }, []);

    const addUserToWallet = useCallback(async (userId: number) => {
        if (!selectedWallet) return;
        try {
            setLoading(true);
            const updatedWallet = await api.current.addUserToWallet(selectedWallet.id, userId);
            setWallets(prev => prev.map(w => {
                if (w.id === selectedWallet.id) {
                    return {
                        ...updatedWallet,
                        userIds: Array.isArray(updatedWallet.userIds)
                            ? updatedWallet.userIds
                            : [...(w.userIds || []), userId]
                    };
                }
                return w;
            }));
            setWalletUsers(prev => [...(prev || []), userId]);
            toast.success("Usuário adicionado com sucesso!");
        } catch (err) {
            toast.error(`Falha ao adicionar usuário: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, [selectedWallet]);

    const removeUserFromWallet = useCallback(async (userId: number) => {
        if (!selectedWallet) return;
        try {
            setLoading(true);
            await api.current.removeUserFromWallet(selectedWallet.id, userId);
            setWallets(prev => prev.map(w =>
                w.id === selectedWallet.id ? {
                    ...w,
                    userIds: w.userIds.filter(id => id !== userId)
                } : w
            ));
            setWalletUsers(prev => prev.filter(id => id !== userId));
            toast.success("Usuário removido com sucesso!");
        } catch (err) {
            toast.error(`Falha ao remover usuário: ${sanitizeErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, [selectedWallet]);

    const loadWalletUsers = useCallback(async () => {
        if (!selectedWallet) return;
        try {
            const userIds = await getWalletUsers(selectedWallet.id);
            setWalletUsers(userIds);
        } catch (err) {
            toast.error(`Error loading users: ${sanitizeErrorMessage(err)}`);
        }
    }, [selectedWallet, getWalletUsers]);

    return (
        <WalletsContext.Provider value={{
            walletsApi: api,
            wallets,
            createWallet,
            deleteWallet,
            updateWalletName,
            getWalletUsers,
            getUserWallets,
            addUserToWallet,
            removeUserFromWallet,
            loading,
            order,
            orderBy,
            sortedWallets,
            handleSort,


            selectedWallet,
            setSelectedWallet,
            walletUsers,
            loadWalletUsers,
        }}>
            {children}
        </WalletsContext.Provider>
    )
}