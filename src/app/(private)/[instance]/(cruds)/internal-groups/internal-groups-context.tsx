"use client";

import {
  ActionDispatch,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

import { useAuthContext } from "@/app/auth-context";
import { InternalGroup, WhatsappGroup } from "@/lib/sdk-local";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { InternalChatContext } from "../../internal-context";
import { useWhatsappContext } from "../../whatsapp-context";
import internalGroupsReducer, {
  ChangeInternalGroupsStateAction,
  InternalGroupsContextState,
} from "./(table)/internal-groups-reducer";
import { createCacheScope } from "@/lib/cache/cache-scope";
import { hybridCache } from "@/lib/cache/hybrid-cache";

interface IInternalGroupsProviderProps {
  children: ReactNode;
}

interface IInternalGroupsContext {
  state: InternalGroupsContextState;
  wppGroups: WhatsappGroup[];
  dispatch: ActionDispatch<[ChangeInternalGroupsStateAction]>;
  updateInternalGroup: (
    id: number,
    data: { name: string; participants: number[]; wppGroupId: string | null },
  ) => void;
  createInternalGroup: (data: {
    name: string;
    participants: number[];
    groupId: string | null;
    groupImage?: File | null;
  }) => Promise<void>;
  deleteInternalGroup: (id: number) => void;
  updateInternalGroupImage: (id: number, file: File) => void;
  loadInternalGroups: (filters: Record<string, string>) => void;
}

export const InternalGroupsContext = createContext<IInternalGroupsContext>(
  {} as IInternalGroupsContext,
);
export const useInternalGroupsContext = () => {
  const context = useContext(InternalGroupsContext);
  return context;
};

export default function InternalGroupsProvider({ children }: IInternalGroupsProviderProps) {
  const { internalApi } = useContext(InternalChatContext);
  const { globalChannel, loaded, wppApi } = useWhatsappContext();
  const { token, user, instance } = useAuthContext();
  const cacheScope = user ? createCacheScope(instance, user.CODIGO) : null;
  const [wppGroups, setWppGroups] = useState<WhatsappGroup[]>([]);
  const [state, dispatch] = useReducer(internalGroupsReducer, {
    internalGroups: [],
    totalRows: 0,
    filters: {
      page: "1",
      perPage: "10",
    },
    isLoading: false,
  });

  const createInternalGroup = useCallback(
    async (data: {
      name: string;
      participants: number[];
      groupId: string | null;
      groupImage?: File | null;
    }) => {
      try {
        if (token && internalApi.current) {
          const created = await internalApi.current.createInternalChat(
            data.participants,
            true,
            data.name,
            data.groupId,
            data.groupImage,
          );
          if (cacheScope) void hybridCache.invalidateResource(cacheScope, "internal-groups");
          dispatch({ type: "add-internal-group", data: created as InternalGroup });
          toast.success("Grupo criado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error creating internal group", err as Error);
        toast.error("Falha ao criar grupo!");
      } finally {
        loadInternalGroups({});
      }
    },
    [cacheScope, token, internalApi],
  );

  const updateInternalGroup = useCallback(
    async (
      id: number,
      data: { name: string; participants: number[]; wppGroupId: string | null },
    ) => {
      try {
        if (token && internalApi.current) {
          const res = await internalApi.current.updateInternalGroup(id, data);
          if (cacheScope) void hybridCache.invalidateResource(cacheScope, "internal-groups");
          dispatch({ type: "update-internal-group", id, data: res });
          toast.success("Grupo atualizado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error updating internal group", err as Error);
        toast.error("Falha ao atualizar grupo!");
      }
    },
    [cacheScope, token, internalApi],
  );

  const updateInternalGroupImage = useCallback(
    async (id: number, file: File) => {
      try {
        if (token && internalApi.current) {
          const res = await internalApi.current.updateInternalGroupImage(id, file);
          if (cacheScope) void hybridCache.invalidateResource(cacheScope, "internal-groups");
          dispatch({
            type: "update-internal-group",
            id,
            data: { groupImageFileId: res.groupImageFileId },
          });
          toast.success("Imagem do grupo atualizada com sucesso!");
        }
      } catch (err) {
        Logger.error("Error updating internal group image", err as Error);
        toast.error("Falha ao atualizar imagem do grupo!");
      }
    },
    [cacheScope, token, internalApi],
  );

  const deleteInternalGroup = useCallback(
    async (id: number) => {
      try {
        if (token && internalApi.current) {
          await internalApi.current.deleteInternalChat(id);
          if (cacheScope) void hybridCache.invalidateResource(cacheScope, "internal-groups");
          dispatch({ type: "delete-internal-group", id });
          toast.success("Grupo deletado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error deleting internal group", err as Error);
        toast.error("Falha ao deletar grupo!");
      }
    },
    [cacheScope, token, internalApi],
  );

  const loadInternalGroups = useCallback(
    async (filters: Record<string, string>) => {
      dispatch({ type: "change-loading", isLoading: true });

      try {
        if (internalApi.current) {
          const groups = await internalApi.current.getInternalGroups();

          // Apply client-side filtering if needed
          let filteredGroups = Array.isArray(groups) ? groups : [];
          if (filters.groupName) {
            filteredGroups = filteredGroups.filter((g) =>
              g.groupName?.toLowerCase().includes(filters.groupName.toLowerCase()),
            );
          }
          if (filters.id) {
            filteredGroups = filteredGroups.filter((g) => g.id.toString().includes(filters.id));
          }

          dispatch({
            type: "multiple",
            actions: [
              { type: "change-total-rows", totalRows: filteredGroups.length },
              { type: "change-loading", isLoading: false },
              { type: "load-internal-groups", internalGroups: filteredGroups },
            ],
          });
          if (cacheScope) void hybridCache.set(cacheScope, "internal-groups", filteredGroups);
        }
      } catch (err) {
        dispatch({ type: "change-loading", isLoading: false });
        Logger.error("Error loading internal groups", err as Error);
        toast.error("Falha ao carregar grupos internos!");
      }
    },
    [cacheScope, internalApi],
  );

  useEffect(() => {
    if (!token || !internalApi.current) return;
    internalApi.current.setAuth(token);
    if (cacheScope) {
      void hybridCache.get<InternalGroup[]>(cacheScope, "internal-groups").then((cached) => {
        if (!cached) return;
        dispatch({ type: "load-internal-groups", internalGroups: cached });
        dispatch({ type: "change-total-rows", totalRows: cached.length });
      });
    }
    loadInternalGroups({});
  }, [cacheScope, token, internalApi, loadInternalGroups]);

  useEffect(() => {
    if (!token || !loaded) {
      setWppGroups([]);
      return;
    }

    const channelId = globalChannel.current?.id;
    if (!channelId) {
      setWppGroups([]);
      return;
    }

    let active = true;
    wppApi.current.setAuth(token);
    wppApi.current
      .getGroups(channelId)
      .then((groups) => {
        if (active) setWppGroups(groups);
      })
      .catch((err) => {
        if (active) setWppGroups([]);
        Logger.debug("Error loading WhatsApp groups", err as Error);
      });

    return () => {
      active = false;
    };
  }, [globalChannel, loaded, token, wppApi]);

  return (
    <InternalGroupsContext.Provider
      value={{
        state,
        dispatch,
        updateInternalGroup,
        createInternalGroup,
        loadInternalGroups,
        wppGroups,
        deleteInternalGroup,
        updateInternalGroupImage,
      }}
    >
      {children}
    </InternalGroupsContext.Provider>
  );
}
