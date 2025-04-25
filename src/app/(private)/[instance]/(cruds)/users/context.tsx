"use client";
import { AuthContext } from "@/app/auth-context";
import { CreateUserDTO, UpdateUserDTO, User, UsersClient } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import UsersModal from "./(modal)/user-modal";
import { WhatsappContext } from "../../whatsapp-context";

interface IUsersProviderProps {
  children: ReactNode;
}

interface IUsersContext {
  users: User[];
  modal: ReactNode;
  loading: boolean;
  order: "desc" | "asc";
  orderBy: keyof User;
  sortedUsers: User[];
  sectors: Array<{ id: number; name: string }>;
  handleSort: (property: keyof User) => void;
  createUser: (data: CreateUserDTO) => void;
  updateUser: (userId: number, data: UpdateUserDTO) => void;
  openUserModal: (user?: User) => void;
  closeModal: () => void;
}

const USERS_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";
export const UsersContext = createContext<IUsersContext>({} as IUsersContext);

export default function UsersProvider({ children }: IUsersProviderProps) {
  const { wppApi } = useContext(WhatsappContext);
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState<keyof User>("CODIGO");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [sectors, setSectors] = useState<Array<{ id: number; name: string }>>([]);
  const apiRef = useRef(new UsersClient(USERS_URL));

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return order === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
    });
  }, [users, order, orderBy]);

  const handleSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const createUser = useCallback(async (data: CreateUserDTO) => {
    try {
      await apiRef.current.createUser(data);
      loadUsers();
      toast.success("Usuário criado com sucesso!");
      closeModal();
    } catch (err) {
      toast.error(`Falha ao criar usuário.\n${sanitizeErrorMessage(err)}`);
    }
  }, []);

  const updateUser = useCallback(async (userId: number, data: UpdateUserDTO) => {
    try {
      await apiRef.current.updateUser(String(userId), data);
      loadUsers();
      toast.success("Usuário atualizado com sucesso!");
      closeModal();
    } catch (err) {
      toast.error(`Falha ao atualizar usuário.\n${sanitizeErrorMessage(err)}`);
    }
  }, []);

  const openUserModal = useCallback(
    (user?: User) => {
      setModal(<UsersModal user={user} />);
    },
    [createUser, updateUser],
  );

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const loadUsers = useCallback(() => {
    setLoading(true);
    apiRef.current
      .getUsers()
      .then((res) => {
        setUsers(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (token) {
      apiRef.current.setAuth(token);
      setLoading(true);

      loadUsers();
    }
  }, [token]);

  useEffect(() => {
    if (wppApi.current && token) {
      wppApi.current.getSectors().then((data) => {
        setSectors(data);
      });
    }
  }, [wppApi, token]);

  return (
    <UsersContext.Provider
      value={{
        users,
        modal,
        loading,
        order,
        orderBy,
        sortedUsers,
        sectors,
        handleSort,
        createUser,
        updateUser,
        openUserModal,
        closeModal,
      }}
    >
      {children}
      {modal}
    </UsersContext.Provider>
  );
}
