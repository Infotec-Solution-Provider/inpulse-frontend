"use client";
import { useCrmQueryState } from "@/lib/ui-system/query-state";
import { AuthContext } from "@/app/auth-context";
import { assertCrmSectorSelection, crmSectorOptions, resolveSectorNamespace, SECTOR_MAPPING_ERROR } from "@/lib/sector-namespace";
import { CreateUserDTO, UpdateUserDTO, User, UsersClient, RequestFilters } from "@/lib/sdk-local";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import {
  ActionDispatch,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const USERS_URL = process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001";
export const UsersContext = createContext<IUsersContext>({} as IUsersContext);

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsersContext must be used within UsersProvider");
  }
  return context;
};

export default function UsersProvider({ children }: IUsersProviderProps) {
  const { sectors: whatsappSectors, tenantPolicy, loaded } = useContext(WhatsappContext);
  const { token, instance, user: actor } = useContext(AuthContext);
  const [query, setQuery] = useCrmQueryState<RequestFilters<User>>("users:list", {
    page: "1",
    perPage: "10",
  });
  const [state, dispatch] = useReducer(usersReducer, {
    users: [],
    totalRows: 0,
    filters: query,
    isLoading: false,
  });
  const [modal, setModal] = useState<ReactNode>(null);
  const namespace = useMemo(() => resolveSectorNamespace(instance, actor?.SETOR, tenantPolicy), [instance, actor?.SETOR, tenantPolicy]);
  const sectors = useMemo(() => loaded ? crmSectorOptions(namespace, whatsappSectors) : [], [loaded, namespace, whatsappSectors]);
  useEffect(() => { setModal(null); }, [instance, actor?.CODIGO, !!token]);
  const apiRef = useRef(new UsersClient(USERS_URL));
  const alive = useRef(true),
    requestSequence = useRef(0),
    currentToken = useRef(token);
  currentToken.current = token;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      requestSequence.current++;
    };
  }, []);
  useEffect(() => {
    setQuery(state.filters);
  }, [JSON.stringify(state.filters)]);

  const createUser = useCallback(
    async (data: CreateUserDTO) => {
      try {
        if (!token || !loaded) throw new Error(SECTOR_MAPPING_ERROR);
        assertCrmSectorSelection(namespace, data.SETOR);
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
    [token, loaded, namespace],
  );

  const updateUser = useCallback(
    async (userId: number, data: UpdateUserDTO) => {
      try {
        if (!token || !loaded) throw new Error(SECTOR_MAPPING_ERROR);
        if (data.SETOR !== undefined) assertCrmSectorSelection(namespace, data.SETOR);
        await apiRef.current.updateUser(String(userId), data);
        toast.success("Usuário atualizado com sucesso!");
        closeModal();
      } catch (err) {
        toast.error(`Falha ao atualizar usuário.\n${sanitizeErrorMessage(err)}`);
      } finally {
        loadUsers();
      }
    },
    [token, loaded, namespace],
  );

  const openUserModal = useCallback((user?: User) => {
    setModal(<UsersModal user={user} />);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const loadUsers = useCallback(async () => {
    const auth = token,
      request = ++requestSequence.current;
    const active = () =>
      alive.current && currentToken.current === auth && requestSequence.current === request;
    if (!token) return;
    apiRef.current.setAuth(token);
    dispatch({ type: "change-loading", isLoading: true });
    try {
      const res = await apiRef.current.getUsers(state.filters);
      if (!active()) return;
      dispatch({
        type: "multiple",
        actions: [
          { type: "load-users", users: res.data },
          { type: "change-loading", isLoading: false },
          { type: "change-total-rows", totalRows: res.page.totalRows || 0 },
        ],
      });
    } catch {
      if (active()) {
        dispatch({ type: "change-loading", isLoading: false });
        toast.error("Falha ao carregar usuários!");
      }
    }
  }, [JSON.stringify(state.filters), token]);
  useEffect(() => {
    void loadUsers();
  }, [token, JSON.stringify(state.filters)]);
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
