import { InternalGroup } from "@in.pulse-crm/sdk";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { InternalChatContext } from "../../internal-context";
import { AuthContext } from "@/app/auth-context";

interface IInternalGroupsProviderProps {
  children: ReactNode;
}

interface IInternalGroupsContext {
  internalGroups: Array<InternalGroup>;
  createInternalGroup: (data: { name: string; participants: number[] }) => Promise<void>;
  updateInternalGroup: (
    id: number,
    data: { name: string; participants: number[] },
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

  const updateInternalGroup = async (
    id: number,
    data: { name: string; participants: number[] },
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

  const createInternalGroup = async (data: { name: string; participants: number[] }) => {
    if (internalApi.current) {
      const created = await internalApi.current.createInternalChat(
        data.participants,
        true,
        data.name,
      );

      setInternalGroups((prev) => [created as InternalGroup, ...prev]);
    }
  };

  useEffect(() => {
    if (token && internalApi.current) {
      internalApi.current.setAuth(token);
      internalApi.current.getInternalGroups().then((groups) => {
        setInternalGroups(groups);
      });
    }
  }, [token]);

  return (
    <InternalGroupsContext.Provider
      value={{ internalGroups, updateInternalGroup, createInternalGroup }}
    >
      {children}
    </InternalGroupsContext.Provider>
  );
}
