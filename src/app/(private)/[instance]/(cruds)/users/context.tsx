"use client"
import { AuthContext } from "@/lib/contexts/auth.context";
import usersService from "@/lib/services/users.service";
import { CreateUserDTO, UpdateUserDTO, User, UserRole } from "@in.pulse-crm/sdk"
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { toast } from "react-toastify";
import CreateUserModal from "./create-user-modal";

interface IUsersProviderProps {
    children: ReactNode;
}

interface IUsersContext {
    users: Array<User>;
    modal: ReactNode;
    form: CreateUserDTO
    createUser: (data: CreateUserDTO) => void;
    updateUser: (userId: number, data: UpdateUserDTO) => void;
    closeModal: () => void;
    openCreateUserModal: () => void;
    changeFormField: <T extends keyof CreateUserDTO>(key: T, data: CreateUserDTO[T]) => void;
}

export const UsersContext = createContext<IUsersContext>({} as IUsersContext);

export default function UsersProvider({ children }: IUsersProviderProps) {
    const { token } = useContext(AuthContext);
    const [users, setUsers] = useState<Array<User>>([]);
    const [modal, setModal] = useState<ReactNode>(null);
    const [form, setForm] = useState<CreateUserDTO>({
        NOME: '',
        LOGIN: '',
        EMAIl: '',
        NIVEL: UserRole.ACTIVE,
        HORARIO: 0,
        SETOR: 1,
        NOME_EXIBICAO: null,
        CODIGO_ERP: '',
        SENHA: '',
        EDITA_CONTATOS: null,
        VISUALIZA_COMPRAS: null,
        CODTELEFONIA: '',
        LIGA_REPRESENTANTE: "NAO",
        LIGA_REPRESENTANTE_DIAS: null,
        limite_diario_agendamento: null,
        EMAIL_EXIBICAO: null,
        ASSINATURA_EMAIL: null,
        OMNI: null,
    });

    const createUser = useCallback(async (data: CreateUserDTO) => {
        try {
            const response = await usersService.createUser(data);
            setUsers(prev => ([response.data, ...prev]));
            toast.success("Usuário criado com sucesso!")
        } catch (err) {
            toast.error(`Falha ao criar usuário.\n${sanitizeErrorMessage(err)}`);
        }
    }, []);

    const updateUser = useCallback(async (userId: number, data: UpdateUserDTO) => {
        try {
            const response = await usersService.updateUser(String(userId), data)
            setUsers(prev => prev.map(u => {
                if (u.CODIGO === userId) {
                    return response.data;
                }

                return u;
            }));
            toast.success("Usuário atualizado com sucesso!")
        } catch (err) {
            toast.error(`Falha ao atualizar usuário.\n${sanitizeErrorMessage(err)}`);
        }
    }, []);

    const openCreateUserModal = useCallback(() => {
        console.log("foi")
        setModal(<CreateUserModal />);
    }, []);

    const closeModal = useCallback(() => {
        setModal(null);
    }, []);

    const changeFormField = useCallback(function <T extends keyof CreateUserDTO>(key: T, data: CreateUserDTO[T]) {
        setForm(prev => ({ ...prev, [key]: data }));
    }, []);

    useEffect(() => {
        if (token) {
            usersService.setAuth(token);
            usersService.getUsers()
                .then(res => setUsers(res.data));
        }
    }, [token]);

    return (
        <UsersContext.Provider value={{
            users,
            modal,
            form,
            createUser,
            updateUser,
            openCreateUserModal,
            closeModal,
            changeFormField
        }}>
            {children}
        </UsersContext.Provider>
    )
}