// @ts-nocheck — deliberately isolated presentation fixtures, no external services.
import { createContext, useContext, useReducer, useState } from "react";
import { TextField } from "@mui/material";
import contactsReducer from "../../src/app/(private)/[instance]/(cruds)/contacts/(table)/contacts-reducer";
import ContactModal from "../../src/app/(private)/[instance]/(cruds)/contacts/(table)/(modal)/contact-modal";
import RuleModal from "../../src/app/(private)/[instance]/(cruds)/auto-response/rule-modal";
export const state = { calls: [], fail: false, massEmpty: false, massReadFailure: false };
const record = (kind, data) => {
  state.calls.push({ kind, data });
  if (state.fail) throw new Error("Falha simulada");
};
export const AuthContext = createContext({
  instance: "tenant-a",
  token: "fixture",
  user: { CODIGO: 1, NOME: "Supervisão fictícia", NIVEL: "ADMIN", SETOR: 1 },
  signOut() {},
});
export const useAuthContext = () => useContext(AuthContext);
export const AppContext = createContext({ modal: null, openModal() {}, closeModal() {} });
export const useAppContext = () => useContext(AppContext);
const sectors = [
  { id: 1, name: "Atendimento" },
  { id: 2, name: "Comercial" },
];
const users = [
  { CODIGO: 1, NOME: "Supervisão fictícia", SETOR: 1 },
  { CODIGO: 2, NOME: "Operação fictícia", SETOR: 2 },
];
export const contacts = [
  {
    id: 1,
    name: "Contato demonstrativo",
    phone: "5511999990000",
    customerId: null,
    sectors: [{ sectorId: 1 }],
  },
];
export const messages = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  title: `Mensagem ${String(i + 1).padStart(2, "0")}`,
  message: `Texto demonstrativo ${i + 1}`,
  fileName: null,
  sectorId: (i % 2) + 1,
  updatedAt: "2026-10-19T10:00:00Z",
}));
const groups = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  groupName: `Grupo demonstrativo ${i + 1}`,
  startedAt: "2026-10-19T10:00:00Z",
  creatorId: 1,
  participants: [{ userId: 1 }],
  wppGroupId: null,
}));
const agents = [
  {
    id: 1,
    name: "Agente demonstrativo",
    description: "Atendimento de demonstração",
    enabled: true,
    model: "gpt-4.1-mini",
    triggers: [],
    allowedActions: ["REPLY"],
    maxTurns: 4,
    knowledgeEntries: [],
    proactiveConfig: null,
  },
];
const wallets = [{ id: 1, name: "Carteira demonstrativa", userIds: [1, 2] }];
const rules = [
  {
    id: 1,
    name: "Regra demonstrativa",
    message: "Olá, estamos fora do expediente.",
    isEnabled: true,
    isGlobal: true,
    cooldownSeconds: 3600,
    userAssignments: [],
    schedules: [],
  },
];
const senderPage = {
  items: [
    {
      senderId: "demo@lid",
      messageCount: 3,
      lastMessage: {
        body: "Mensagem demonstrativa",
        timestamp: "1792404000",
        type: "chat",
        chat: { groupName: "Grupo demonstrativo" },
      },
    },
  ],
  page: 1,
  perPage: 20,
  total: 1,
  totalPages: 1,
};
const internalApi = {
  current: {
    setAuth() {},
    async getUnidentifiedWhatsappSenders() {
      return senderPage;
    },
    async getInternalWhatsappSenderMessages() {
      return { items: [], total: 0, page: 1, totalPages: 1 };
    },
  },
};
const wppApi = {
  current: {
    ax: {
      async get() {
        return { data: { templates: [] } };
      },
    },
    setAuth() {},
    async getSectors() {
      return sectors;
    },
    async getContactsWithCustomer() {
      return { data: contacts, pagination: { total: contacts.length } };
    },
    async getCustomerProfileSummaries() {
      return [];
    },
    async getContactActionRequests() {
      return [];
    },
    async getDeletedContacts() {
      return { data: [], pagination: { total: 0, totalPages: 1 } };
    },
    async getReadyMessages() {
      return messages;
    },
    async getOfficialTemplates() {
      return [];
    },
  },
};
export const InternalChatContext = createContext({ users, internalApi });
export const useInternalChatContext = () => useContext(InternalChatContext);
export const WhatsappContext = createContext({
  loaded: true,
  parameters: {
    feature_ai_enabled: "true",
    feature_ai_agents_enabled: "true",
    feature_ai_settings_enabled: "true",
    feature_funnels_enabled: "true",
    feature_sip_config_enabled: "true",
    feature_mass_messages_enabled: "true",
  },
  sectors,
  channels: [{ id: 1, name: "Canal demonstrativo", type: "WABA" }],
  templates: [],
  globalChannel: { current: null },
  wppApi,
  refreshParameters() {},
});
export const useWhatsappContext = () => useContext(WhatsappContext);
export const WPP_BASE_URL = "http://127.0.0.1:4201";
export const ContactsContext = createContext({});
export const useContactsContext = () => useContext(ContactsContext);
export const ReadyMessagesContext = createContext({});
export const useReadyMessagesContext = () => useContext(ReadyMessagesContext);
export const InternalGroupsContext = createContext({});
export const useInternalGroupsContext = () => useContext(InternalGroupsContext);
export const AutoResponseContext = createContext({});
export const useAutoResponseContext = () => useContext(AutoResponseContext);
export const AiAgentsContext = createContext({});
export const useAiAgentsContext = () => useContext(AiAgentsContext);
export const WalletsContext = createContext({});
export const MentionDirectoryContext = createContext({ users: new Map(), senders: new Map() });
export function PreviewProviders({ children }) {
  const [modal, setModal] = useState(null),
    [selectedWallet, setSelectedWallet] = useState(null);
  const [contactState, dispatchContacts] = useReducer(contactsReducer, {
    contacts,
    totalRows: 1,
    filters: { page: "1", perPage: "10", sectorIds: [] },
    isLoading: false,
  });
  const app = { modal, openModal: setModal, closeModal: () => setModal(null) };
  const contactsValue = {
    state: contactState,
    dispatch: dispatchContacts,
    loadContacts: () => record("refresh-contacts", null),
    openContactModal: (contact) => setModal(<ContactModal contact={contact} />),
    handleDeleteContact() {},
    customerMap: new Map(),
    customerObjectMap: new Map(),
    async createContact(...args) {
      record("create-contact", args);
      setModal(null);
    },
    async updateContact(...args) {
      record("update-contact", args);
      setModal(null);
    },
  };
  const messagesValue = {
    readyMessages: messages,
    async fetchReadyMessages() {},
    state: {
      readyMessages: messages,
      totalRows: messages.length,
      filters: { page: "1", perPage: "10" },
      isLoading: false,
    },
    dispatch() {},
    sectors,
    variables: [],
    async loadReadyMessages() {
      record("refresh-messages", null);
    },
    async createReadyMessage(...args) {
      record("create-message", args);
    },
    async updateReadyMessage(...args) {
      record("update-message", args);
    },
    async deleteReadyMessage(...args) {
      record("delete-message", args);
    },
  };
  const groupsValue = {
    state: {
      internalGroups: groups,
      totalRows: groups.length,
      filters: { page: "1", perPage: "10" },
      isLoading: false,
    },
    dispatch() {},
    wppGroups: [],
    wppGroupsLoading: false,
    wppGroupsUnavailable: false,
    loadInternalGroups: () => record("refresh-groups", null),
    async createInternalGroup(...args) {
      record("create-group", args);
    },
    async updateInternalGroup(...args) {
      record("update-group", args);
    },
  };
  const ruleValue = {
    rules,
    isLoading: false,
    modal: null,
    loadRules() {},
    openRuleModal: (rule) => setModal(<RuleModal rule={rule} />),
    closeModal: app.closeModal,
    handleDeleteRule() {},
    async createRule(data) {
      record("create-rule", data);
    },
    async updateRule(...args) {
      record("update-rule", args);
    },
  };
  const agentValue = {
    agents,
    loading: false,
    async loadAgents() {},
    campaignOptions: [],
    segmentOptions: [],
    operatorOptions: [],
    lookupsLoading: false,
    audiencePreview: null,
    audiencePreviewLoading: false,
    loadAudienceLookups() {},
    clearAudiencePreview() {},
    async createAgent(data) {
      record("create-agent", data);
      return true;
    },
    async updateAgent(...args) {
      record("update-agent", args);
      return true;
    },
    async deleteAgent() {},
  };
  const walletValue = {
    wallets,
    sortedWallets: wallets,
    loading: false,
    order: "asc",
    orderBy: "name",
    handleSort() {},
    selectedWallet,
    setSelectedWallet,
    walletUsers: [],
    async loadWalletUsers() {},
    async createWallet(name) {
      record("create-wallet", name);
      return true;
    },
    async deleteWallet() {},
    async updateWalletName() {},
  };
  return (
    <AppContext.Provider value={app}>
      <ContactsContext.Provider value={contactsValue}>
        <ReadyMessagesContext.Provider value={messagesValue}>
          <InternalGroupsContext.Provider value={groupsValue}>
            <AutoResponseContext.Provider value={ruleValue}>
              <AiAgentsContext.Provider value={agentValue}>
                <WalletsContext.Provider value={walletValue}>{children}</WalletsContext.Provider>
              </AiAgentsContext.Provider>
            </AutoResponseContext.Provider>
          </InternalGroupsContext.Provider>
        </ReadyMessagesContext.Provider>
      </ContactsContext.Provider>
    </AppContext.Provider>
  );
}
export function Empty() {
  return null;
}
export function FakeCustomerInput() {
  return <TextField label="Cliente" size="small" />;
}
export const filesService = {
  getFileDownloadUrl() {
    return "";
  },
};
export const customersService = {
  setAuth() {},
  async getCampaigns() {
    return [];
  },
};
export const usersService = {
  setAuth() {},
  async getUsers() {
    return { data: users };
  },
  async getGlobalSipConfig() {
    return {};
  },
  async getWebrtcSettings() {
    return {
      enabled: true,
      mode: "direct",
      pbxAddress: "",
      websocketUrl: "wss://demo.invalid",
      domain: "demo.invalid",
      iceServers: [],
    };
  },
};
export const aiService = {
  async getTenantConfig() {
    return {
      model: "gpt-4.1-mini",
      availableModels: [],
      featureModels: {},
      operatorBudgets: {},
      monthlyBudgetUsd: null,
    };
  },
  async getUsageSummary() {
    throw new Error("Uso não disponível na prévia");
  },
  async getOpenAiKeyStatus() {
    return { configured: false, storageAvailable: true };
  },
};
export const funnelService = {
  async listFunnels() {
    return [
      {
        id: 1,
        name: "Pipeline demonstrativo",
        type: "AUTOMATIC",
        createdAt: "2026-10-19T10:00:00Z",
      },
    ];
  },
  async getConfig() {
    return {
      funnel: { id: 1, name: "Pipeline demonstrativo", type: "AUTOMATIC", stages: [] },
      resultados: [],
      templates: [],
      triggerBindings: [],
    };
  },
  async createFunnel(_token, name, type) {
    record("create-pipeline", { name, type });
    return { id: 2, name, type, createdAt: "2026-10-19T10:00:00Z" };
  },
};

const campaign = {
  id: 1,
  name: "Disparo demonstrativo",
  description: "Dados fictícios",
  status: "DRAFT",
  senderClientId: 1,
  createdBy: 1,
  createdAt: "2026-10-19T10:00:00Z",
  updatedAt: "2026-10-19T10:00:00Z",
  launchedAt: null,
  scheduleRule: {
    sendMode: "ONE_TIME",
    startAt: "2026-10-20T00:00:00Z",
    endAt: null,
    timeRangesJson: [],
    allowedWeekdaysJson: [],
  },
};
export const marketingService = {
  async listCampaigns(filters) {
    record("read-mass", filters);
    if (state.massDelay && filters.status === "DRAFT")
      await new Promise((resolve) => setTimeout(resolve, 1200));
    if (state.massReadFailure) throw new Error("Falha de leitura simulada");
    return {
      data: state.massEmpty
        ? []
        : [
            {
              ...campaign,
              ...(state.massDelay && filters.status
                ? { name: `Disparo ${filters.status}`, status: filters.status }
                : {}),
            },
          ],
      page: { totalRows: state.massEmpty ? 0 : 1 },
    };
  },
  async getMonitoring() {
    return {
      audience: { totalSnapshots: 1 },
      dispatches: {
        PENDING: 0,
        PROCESSING: 0,
        SENT: 0,
        DELIVERED: 0,
        READ: 0,
        FAILED: 0,
        CANCELLED: 0,
      },
    };
  },
  async createCampaign(data) {
    record("create-mass", data);
    return { id: 2, ...data };
  },
};
export const getMetrics = async () => [
  {
    id: "1",
    name: "Métrica demonstrativa",
    tableName: "demo",
    aggregation: "count",
    column: "id",
    visualizationType: "table",
  },
];
export const deleteMetric = async () => {};
export const getDashboards = async () => [
  { id: "1", name: "Painel demonstrativo", description: "Descrição demonstrativa", items: [] },
];
export const createDashboard = async () => ({ id: "2" });
export const getDashboard = async () => ({
  id: "1",
  name: "Painel demonstrativo",
  description: "Descrição demonstrativa",
  items: [],
});
export const addDashboardItem = async () => ({});
export const removeDashboardItem = async () => ({});
export const executeDashboard = async () => ({ data: [] });
export const getTables = async () => [{ name: "demo", columns: [{ name: "id", type: "number" }] }];
export const createMetric = async () => ({ id: "2" });
export const listGeneratedReports = async () => [
  {
    id: "1",
    title: "Relatório demonstrativo",
    description: "Dados fictícios",
    status: "SAVED",
    updatedAt: "2026-10-19T10:00:00Z",
  },
];
export const SqlReportsContext = createContext({
  history: [],
  loading: false,
  error: null,
  sql: "",
  description: "",
  setSql() {},
  setDescription() {},
  resultData: [],
  resultColumns: [],
  async executeReport() {},
  async exportReport() {},
});
export function SqlReportsProvider({ children }) {
  return children;
}
