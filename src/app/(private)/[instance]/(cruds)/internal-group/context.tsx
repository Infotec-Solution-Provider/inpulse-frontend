"use client";
import { AuthContext } from "@/app/auth-context";
import internalgroupsService from "@/lib/services/internalgroups.service";
import { InternalGroupClient as InternalGroup } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";
import InternalGroupsModal from "./(modal)/internalgroup-modal";

interface IInternalGroupsProviderProps {
  children: ReactNode;
}

interface IInternalGroupsContext {
  internalgroups: InternalGroup[];
  modal: ReactNode;
  loading: boolean;
  order: "desc" | "asc";
  orderBy: keyof InternalGroup;
  sortedInternalGroups: InternalGroup[];
  handleSort: (property: keyof InternalGroup) => void;
  //createInternalGroup: (data: CreateInternalGroupDTO) => void;
  //updateInternalGroup: (internalgroupId: number, data: UpdateInternalGroupDTO) => void;
  openInternalGroupModal: (internalgroup?: InternalGroup) => void;
  closeModal: () => void;
}

export const InternalGroupsContext = createContext<IInternalGroupsContext>({} as IInternalGroupsContext);

export default function InternalGroupsProvider({ children }: IInternalGroupsProviderProps) {
  const { token } = useContext(AuthContext);
  const [internalgroups, setInternalGroups] = useState<InternalGroup[]>([]);
  const [modal, setModal] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState<keyof InternalGroup>("CODIGO");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const sortedInternalGroups = useMemo(() => {
    return [...internalgroups].sort((a, b) => {
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
  }, [internalgroups, order, orderBy]);

  const handleSort = (property: keyof InternalGroup) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const createInternalGroup = useCallback(async (data: any) => {
    try {
      const createdInternalGroup = await internalgroupsService.createInternalGroup(data);
      setInternalGroups((prev) => [createdInternalGroup, ...prev]);
      toast.success("Grupo criado com sucesso!");
      closeModal();
    } catch (err) {
      toast.error(`Falha ao criar usuário.\n${sanitizeErrorMessage(err)}`);
    }
  }, []);

  const updateInternalGroup = useCallback(async (internalgroupId: number, data: any) => {
    try {
      const internalgroup = await internalgroupsService.updateInternalGroup(String(internalgroupId), data);
      setInternalGroups((prev) => prev.map((u) => (u.CODIGO === internalgroupId ? internalgroup : u)));
      toast.success("Grupo atualizado com sucesso!");
      closeModal();
    } catch (err) {
      toast.error(`Falha ao atualizar usuário.\n${sanitizeErrorMessage(err)}`);
    }
  }, []);

  const openInternalGroupModal = useCallback(
    (internalgroup?: InternalGroup) => {
      setModal(<InternalGroupsModal internalgroup={internalgroup} />);
    },
    [createInternalGroup, updateInternalGroup],
  );

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  useEffect(() => {
    if (token) {
      internalgroupsService.setAuth(token);
      setLoading(true);

      internalgroupsService
        .getInternalGroups()
        .then((res) => {
          setInternalGroups(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token]);

  return (
    <InternalGroupsContext.Provider
      value={{
        internalgroups,
        modal,
        loading,
        order,
        orderBy,
        sortedInternalGroups,
        handleSort,
        //createInternalGroup,
       // updateInternalGroup,
        openInternalGroupModal,
        closeModal,
      }}
    >
      {children}
      {modal}
    </InternalGroupsContext.Provider>
  );
}
