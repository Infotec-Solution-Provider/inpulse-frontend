import { InternalGroup } from "@in.pulse-crm/sdk";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { InternalChatContext } from "../../internal-context";
import { AuthContext } from "@/app/auth-context";
import axios from "axios";
import { WPP_BASE_URL } from "../../whatsapp-context";
import { toast } from "react-toastify";

interface IInternalGroupsProviderProps {
  children: ReactNode;
}

export interface IWppGroup {
  id: {
    user: string;
  };
  name: string;
}

interface IInternalGroupsContext {
  internalGroups: Array<InternalGroup>;
  wppGroups: Array<IWppGroup>;
  createInternalGroup: (data: {
    name: string;
    participants: number[];
    groupId: string | null;
  }) => Promise<void>;
  deleteInternalGroup: (id: number) => Promise<void>;
  updateInternalGroup: (
    id: number,
    data: { name: string; participants: number[]; wppGroupId: string | null },
  ) => Promise<void>;
}

const InternalGroupsContext = createContext({} as IInternalGroupsContext);
export const useInternalGroupsContext = () => {
  const context = useContext(InternalGroupsContext);
  if (!context) {
    throw new Error("useWhatsappContext must be used within a WhatsappProvider");
  }
  return context;
};

export default function InternalGroupsProvider({ children }: IInternalGroupsProviderProps) {
  const { token } = useContext(AuthContext);
  const { internalApi } = useContext(InternalChatContext);
  const [internalGroups, setInternalGroups] = useState<Array<InternalGroup>>([]);
  const [wppGroups, setWppGroups] = useState<Array<IWppGroup>>([]);

  const updateInternalGroup = async (
    id: number,
    data: { name: string; participants: number[]; wppGroupId: string | null },
  ) => {
    if (internalApi.current) {
      const res = await internalApi.current.updateInternalGroup(id, data);

      setInternalGroups((prev) =>
        prev.map((group) => {
          if (group.id === id) {
            return res;
          }
          return group;
        }),
      );
    }
  };

  const createInternalGroup = async (data: {
    name: string;
    groupId: string | null;
    participants: number[];
  }) => {
    if (internalApi.current) {
      try {
        const created = await internalApi.current.createInternalChat(
          data.participants,
          true,
          data.name,
          data.groupId,
        );

        console.log("created", created);
        toast.success("Grupo criado com sucesso!");
        setInternalGroups((prev) => [created as InternalGroup, ...prev]);
      } catch (error) {
        console.error("Error creating internal group", error);
        toast.error("Erro ao criar grupo");
      }
    }
  };

  const deleteInternalGroup = async (id: number) => {
    if (internalApi.current) {
      try {
        await internalApi.current.deleteInternalChat(id);
        toast.success("Grupo deletado com sucesso!");
        setInternalGroups((prev) => prev.filter((group) => group.id !== id));
      } catch (error) {
        toast.error("Erro ao deletar grupo");
      }
    }
  };

  useEffect(() => {
    if (token && internalApi.current) {
      internalApi.current.setAuth(token);
      internalApi.current.getInternalGroups().then((groups) => {
        setInternalGroups(groups);
      });

      axios
        .get(WPP_BASE_URL + "/api/whatsapp/groups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          console.log(res.data.data);
          setWppGroups(res.data.data);
        });
    }
  }, [token]);

  return (
    <InternalGroupsContext.Provider
      value={{
        internalGroups,
        wppGroups,
        updateInternalGroup,
        createInternalGroup,
        deleteInternalGroup,
      }}
    >
      {children}
    </InternalGroupsContext.Provider>
  );
}
