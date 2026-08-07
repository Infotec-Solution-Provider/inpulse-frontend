"use client";

import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import type {
  AiAgent,
  AiAgentAudienceInput,
  AiAgentAudiencePreview,
  AiAgentKnowledgeEntryInput,
  CreateAiAgentInput,
  CustomerLookupOption,
  UpdateAiAgentInput,
} from "@/lib/types/sdk-local.types";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";

import aiService from "../../../../../lib/services/ai.service";

interface SaveAudienceOptions {
  showSuccessToast?: boolean;
}

function getLookupName(option: CustomerLookupOption) {
  return option.NOME?.trim() || `Codigo ${option.CODIGO}`;
}

function getLookupPriority(option: CustomerLookupOption) {
  return getLookupName(option).toUpperCase() === "AGENDA PUBLICA" ? 0 : 1;
}

function sortLookupOptions(options: CustomerLookupOption[]) {
  return [...options].sort(
    (left, right) =>
      getLookupPriority(left) - getLookupPriority(right) || getLookupName(left).localeCompare(getLookupName(right)),
  );
}

interface IAiAgentsContext {
  agents: AiAgent[];
  loading: boolean;
  selectedAgent: AiAgent | null;
  campaignOptions: CustomerLookupOption[];
  segmentOptions: CustomerLookupOption[];
  operatorOptions: CustomerLookupOption[];
  lookupsLoading: boolean;
  audiencePreview: AiAgentAudiencePreview | null;
  audiencePreviewLoading: boolean;
  setSelectedAgent: (agent: AiAgent | null) => void;
  loadAgents: () => Promise<void>;
  loadAudienceLookups: () => Promise<void>;
  clearAudiencePreview: () => void;
  createAgent: (data: CreateAiAgentInput) => Promise<boolean>;
  updateAgent: (id: number, data: UpdateAiAgentInput) => Promise<boolean>;
  saveAgentAudience: (
    agentId: number,
    data: AiAgentAudienceInput,
    options?: SaveAudienceOptions,
  ) => Promise<boolean>;
  previewAgentAudience: (agentId: number, page?: number, perPage?: number) => Promise<void>;
  deleteAgent: (id: number) => Promise<void>;
  addKnowledgeEntry: (agentId: number, data: AiAgentKnowledgeEntryInput) => Promise<boolean>;
  deleteKnowledgeEntry: (agentId: number, entryId: number) => Promise<void>;
}

export const AiAgentsContext = createContext<IAiAgentsContext>({} as IAiAgentsContext);

export function useAiAgentsContext() {
  const ctx = useContext(AiAgentsContext);
  if (!ctx) throw new Error("useAiAgentsContext must be used within AiAgentsProvider");
  return ctx;
}

export default function AiAgentsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [campaignOptions, setCampaignOptions] = useState<CustomerLookupOption[]>([]);
  const [segmentOptions, setSegmentOptions] = useState<CustomerLookupOption[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<CustomerLookupOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState<AiAgentAudiencePreview | null>(null);
  const [audiencePreviewLoading, setAudiencePreviewLoading] = useState(false);

  const replaceAgent = useCallback((updatedAgent: AiAgent) => {
    setAgents((prev) => prev.map((agent) => (agent.id === updatedAgent.id ? updatedAgent : agent)));
    setSelectedAgent((prev: AiAgent | null) => (prev?.id === updatedAgent.id ? updatedAgent : prev));
  }, []);

  const removeAgent = useCallback((agentId: number) => {
    setAgents((prev) => prev.filter((agent) => agent.id !== agentId));
    setSelectedAgent((prev: AiAgent | null) => (prev?.id === agentId ? null : prev));
  }, []);

  const clearAudiencePreview = useCallback(() => {
    setAudiencePreview(null);
  }, []);

  const loadAgents = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await aiService.listAgents(token);
      setAgents(data);
    } catch (err) {
      toast.error(`Falha ao carregar agentes de IA: ${sanitizeErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadAudienceLookups = useCallback(async () => {
    if (!token) return;

    try {
      setLookupsLoading(true);
      customersService.setAuth(token);
      const [campaigns, segments, operators] = await Promise.all([
        customersService.getCampaigns(),
        customersService.getSegments(),
        customersService.getOperators(),
      ]);

      setCampaignOptions(sortLookupOptions(campaigns));
      setSegmentOptions(sortLookupOptions(segments));
      setOperatorOptions(sortLookupOptions(operators));
    } catch (err) {
      toast.error(`Falha ao carregar filtros de público: ${sanitizeErrorMessage(err)}`);
    } finally {
      setLookupsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadAudienceLookups();
  }, [loadAudienceLookups]);

  const createAgent = useCallback(
    async (data: CreateAiAgentInput): Promise<boolean> => {
      if (!token) return false;

      try {
        const agent = await aiService.createAgent(data, token);
        setAgents((prev) => [...prev, agent]);
        toast.success("Agente criado com sucesso!");
        return true;
      } catch (err) {
        toast.error(`Falha ao criar agente: ${sanitizeErrorMessage(err)}`);
        return false;
      }
    },
    [token],
  );

  const updateAgent = useCallback(
    async (id: number, data: UpdateAiAgentInput): Promise<boolean> => {
      if (!token) return false;

      try {
        const updated = await aiService.updateAgent(id, data, token);
        replaceAgent(updated);
        toast.success("Agente atualizado com sucesso!");
        return true;
      } catch (err) {
        toast.error(`Falha ao atualizar agente: ${sanitizeErrorMessage(err)}`);
        return false;
      }
    },
    [replaceAgent, token],
  );

  const saveAgentAudience = useCallback(
    async (
      agentId: number,
      data: AiAgentAudienceInput,
      options?: SaveAudienceOptions,
    ): Promise<boolean> => {
      if (!token) return false;

      try {
        const updated = await aiService.upsertAgentAudience(agentId, data, token);
        replaceAgent(updated);
        if (options?.showSuccessToast !== false) {
          toast.success("Público do agente atualizado com sucesso!");
        }
        return true;
      } catch (err) {
        toast.error(`Falha ao salvar público do agente: ${sanitizeErrorMessage(err)}`);
        return false;
      }
    },
    [replaceAgent, token],
  );

  const previewAgentAudience = useCallback(
    async (agentId: number, page = 1, perPage = 10) => {
      if (!token) return;

      try {
        setAudiencePreviewLoading(true);
        const preview = await aiService.previewAgentAudience(agentId, { page, perPage }, token);
        setAudiencePreview(preview);
      } catch (err) {
        setAudiencePreview(null);
        toast.error(`Falha ao gerar prévia do público: ${sanitizeErrorMessage(err)}`);
      } finally {
        setAudiencePreviewLoading(false);
      }
    },
    [token],
  );

  const deleteAgent = useCallback(
    async (id: number) => {
      if (!token) return;

      try {
        await aiService.deleteAgent(id, token);
        removeAgent(id);
        toast.success("Agente removido.");
      } catch (err) {
        toast.error(`Falha ao remover agente: ${sanitizeErrorMessage(err)}`);
      }
    },
    [removeAgent, token],
  );

  const addKnowledgeEntry = useCallback(
    async (agentId: number, data: AiAgentKnowledgeEntryInput): Promise<boolean> => {
      if (!token) return false;

      try {
        const updated = await aiService.addAgentKnowledgeEntry(agentId, data, token);
        replaceAgent(updated);
        toast.success("Entrada de conhecimento adicionada.");
        return true;
      } catch (err) {
        toast.error(`Falha: ${sanitizeErrorMessage(err)}`);
        return false;
      }
    },
    [replaceAgent, token],
  );

  const deleteKnowledgeEntry = useCallback(
    async (agentId: number, entryId: number) => {
      if (!token) return;

      try {
        await aiService.deleteAgentKnowledgeEntry(agentId, entryId, token);
        await loadAgents();
        toast.success("Entrada removida.");
      } catch (err) {
        toast.error(`Falha: ${sanitizeErrorMessage(err)}`);
      }
    },
    [loadAgents, token],
  );

  return (
    <AiAgentsContext.Provider
      value={{
        agents,
        loading,
        selectedAgent,
        campaignOptions,
        segmentOptions,
        operatorOptions,
        lookupsLoading,
        audiencePreview,
        audiencePreviewLoading,
        setSelectedAgent,
        loadAgents,
        loadAudienceLookups,
        clearAudiencePreview,
        createAgent,
        updateAgent,
        saveAgentAudience,
        previewAgentAudience,
        deleteAgent,
        addKnowledgeEntry,
        deleteKnowledgeEntry,
      }}
    >
      {children}
    </AiAgentsContext.Provider>
  );
}
