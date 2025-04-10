"use client"
import { AuthContext } from "@/lib/contexts/auth.context";
import usersService from "@/lib/services/users.service";
import { CreateUserDTO, UpdateUserDTO, User } from "@in.pulse-crm/sdk"
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { toast } from "react-toastify";
import UsersModal from "./users-modal";

interface IUsersProviderProps {
    children: ReactNode;
}

interface IUsersContext {
    users: User[];
    loading: boolean;
    createUser: (data: CreateUserDTO) => void;
    updateUser: (userId: number, data: UpdateUserDTO) => void;
    openCreateUserModal: (user?: User) => void;
    closeModal: () => void;
}

export const UsersContext = createContext<IUsersContext>({} as IUsersContext);

export default function UsersProvider({ children }: IUsersProviderProps) {
    const { token } = useContext(AuthContext);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ReactNode>(null);

    const createUser = useCallback(async (data: CreateUserDTO) => {
        try {
            const response = await usersService.createUser(data);
            setUsers(prev => ([response.data, ...prev]));
            toast.success("Usuário criado com sucesso!");
            closeModal();
        } catch (err) {
            toast.error(`Falha ao criar usuário.\n${sanitizeErrorMessage(err)}`);
        }
    }, []);

    const updateUser = useCallback(async (userId: number, data: UpdateUserDTO) => {
        try {
            const response = await usersService.updateUser(String(userId), data)
            setUsers(prev => prev.map(u => u.CODIGO === userId ? response.data : u));
            toast.success("Usuário atualizado com sucesso!");
            closeModal();
        } catch (err) {
            toast.error(`Falha ao atualizar usuário.\n${sanitizeErrorMessage(err)}`);
        }
    }, []);

    const openCreateUserModal = useCallback((user?: Partial<User>) => {
        setModal(
            <UsersModal
                open={true}
                onClose={(data) => {
                    if (data) {
                        if (user?.CODIGO) {
                            updateUser(user.CODIGO, data);
                        } else {
                            createUser(data as CreateUserDTO);
                        }
                    }
                    closeModal();
                }}
                user={user || {}}
            />
        );
    }, [createUser, updateUser]);

    const closeModal = useCallback(() => {
        setModal(null);
    }, []);

    useEffect(() => {
        if (token) {
            usersService.setAuth(token);
            setLoading(true);
            usersService.getUsers()
                .then(res => {
                    setUsers(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [token]);

    return (
        <UsersContext.Provider value={{
            users,
            loading,
            createUser,
            updateUser,
            openCreateUserModal,
            closeModal
        }}>
            {children}
            {modal}
        </UsersContext.Provider>
    )
}