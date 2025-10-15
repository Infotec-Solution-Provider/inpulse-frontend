"use client";
import { AuthContext } from "@/app/auth-context";
import { CreateUserDTO, UpdateUserDTO, User, UsersClient } from "@in.pulse-crm/sdk";
import { Logger, sanitizeErrorMessage } from "@in.pulse-crm/utils";
import {
  ActionDispatch,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { WhatsappContext } from "../../whatsapp-context";
import UsersModal from "./(modal)/user-modal";
import usersReducer, {
  ChangeUsersStateAction,
  MultipleActions,
  UsersContextState,
} from "./(table)/users-reducer";

interface IUsersProviderProps {
  children: ReactNode;
}

interface IUsersContext {
  state: UsersContextState;
  dispatch: ActionDispatch<[action: ChangeUsersStateAction | MultipleActions]>;
  modal: ReactNode;
  sectors: Array<{ id: number; name: string }>;
  createUser: (data: CreateUserDTO) => void;
  updateUser: (userId: number, data: UpdateUserDTO) => void;
  openUserModal: (user?: User) => void;
  closeModal: () => void;
  loadUsers: () => void;
}

const USERS_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";
export const UsersContext = createContext<IUsersContext>({} as IUsersContext);

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsersContext must be used within UsersProvider");
  }
  return context;
};

export default function UsersProvider({ children }: IUsersProviderProps) {
  const { wppApi } = useContext(WhatsappContext);
  const { token } = useContext(AuthContext);
  const [state, dispatch] = useReducer(usersReducer, {
    users: [],
    totalRows: 0,
    filters: { page: "1", perPage: "10" },
    isLoading: false,
  });
  const [modal, setModal] = useState<ReactNode>(null);
  const [sectors, setSectors] = useState<Array<{ id: number; name: string }>>([]);
  const apiRef = useRef(new UsersClient(USERS_URL));

  const createUser = useCallback(
    async (data: CreateUserDTO) => {
      try {
        const res = await apiRef.current.createUser(data);
        dispatch({ type: "add-user", data: res });
        toast.success("Usuário criado com sucesso!");
        closeModal();
      } catch (err) {
        toast.error(`Falha ao criar usuário.\n${sanitizeErrorMessage(err)}`);
      } finally {
        loadUsers();
      }
    },
    [token],
  );

  const updateUser = useCallback(
    async (userId: number, data: UpdateUserDTO) => {
      try {
        await apiRef.current.updateUser(String(userId), data);
        toast.success("Usuário atualizado com sucesso!");
        closeModal();
      } catch (err) {
        toast.error(`Falha ao atualizar usuário.\n${sanitizeErrorMessage(err)}`);
      } finally {
        loadUsers();
      }
    },
    [token],
  );

  const openUserModal = useCallback((user?: User) => {
    setModal(<UsersModal user={user} />);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const loadUsers = useCallback(async () => {
    dispatch({ type: "change-loading", isLoading: true });

    try {
      if (!token) {
        return dispatch({ type: "change-loading", isLoading: false });
      }
      const res = await apiRef.current.getUsers(state.filters);

      Logger.debug("UsersContext:loadUsers: ", res);

      dispatch({
        type: "multiple",
        actions: [
          { type: "load-users", users: res.data },
          { type: "change-loading", isLoading: false },
          { type: "change-total-rows", totalRows: res.page.totalRows || 0 },
        ],
      });
    } catch {
      dispatch({ type: "change-loading", isLoading: false });
      toast.error("Falha ao carregar usuários!");
    }
  }, [state.filters, token]);

  useEffect(() => {
    if (!token || !apiRef.current) return;
    apiRef.current.setAuth(token);
    loadUsers();
  }, [token]);

  useEffect(() => {
    if (wppApi.current && token) {
      wppApi.current.setAuth(token);
      wppApi.current.getSectors().then((data) => {
        setSectors(data);
      });
    }
  }, [wppApi, token]);

  useEffect(() => {
    loadUsers();
  }, [state.filters.perPage, state.filters.page]);

  return (
    <UsersContext.Provider
      value={{
        state,
        dispatch,
        modal,
        sectors,
        createUser,
        updateUser,
        openUserModal,
        closeModal,
        loadUsers,
      }}
    >
      {children}
      {modal}
    </UsersContext.Provider>
  );
}
