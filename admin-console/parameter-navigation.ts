import type { Source } from "./types";

export const FEATURES_SOURCE = "features";

export function configurationSources(sources: Source[]): Source[] {
  const parameters = sources.find((source) => source.id === "whatsapp");
  return parameters
    ? [{ ...parameters, id: FEATURES_SOURCE, label: "Features" }, ...sources]
    : sources;
}

export function settingsSourceId(sourceId?: string) {
  return sourceId === FEATURES_SOURCE ? "whatsapp" : sourceId;
}

interface AreaDefinition {
  id: string;
  label: string;
  description: string;
  sources: string[];
}

const areas: AreaDefinition[] = [
  {
    id: FEATURES_SOURCE,
    label: "Features",
    description: "Flags e recursos do tenant",
    sources: [FEATURES_SOURCE],
  },
  {
    id: "whatsapp",
    label: "WhatsApp e atendimento",
    description: "Recursos, permissões e canais",
    sources: ["whatsapp", "channels"],
  },
  { id: "crm", label: "CRM", description: "Parâmetros de relacionamento", sources: ["crm"] },
  {
    id: "ai",
    label: "Inteligência artificial",
    description: "IA, agente padrão e OpenAI",
    sources: ["ai", "ai-agent", "openai"],
  },
  {
    id: "telephony",
    label: "Telefonia",
    description: "SIP, WebRTC e AMI",
    sources: ["sip-global", "sip-user", "webrtc", "ami"],
  },
  { id: "email", label: "Email", description: "SMTP e contas de envio", sources: ["smtp"] },
  {
    id: "integrations",
    label: "Integrações e armazenamento",
    description: "Tenant, conexão CRM e arquivos",
    sources: ["tenant", "database", "storage"],
  },
];

const details: Record<string, string> = {
  [FEATURES_SOURCE]: "Ative ou desative recursos por instância, setor ou usuário.",
  whatsapp: "Permissões e regras de atendimento",
  channels: "Configuração e credenciais por canal",
  crm: "Opções e comportamento do CRM",
  ai: "Modelos e recursos de inteligência artificial",
  "ai-agent": "Configuração do agente padrão",
  openai: "Estado e substituição da credencial",
  "sip-global": "Configurações gerais de telefonia",
  "sip-user": "Credenciais SIP por operador",
  webrtc: "Conexão de voz no navegador",
  ami: "Reaplicação da conexão AMI salva",
  smtp: "Servidor de email e configurações por usuário",
  tenant: "Parâmetros técnicos do tenant",
  database: "Destino e credenciais do banco CRM",
  storage: "Agentes e contas de armazenamento",
};

export const sourceDescription = (source: Source) => details[source.id] ?? source.category;
export const sourceAreaId = (sourceId: string) =>
  areas.find((area) => area.sources.includes(sourceId))?.id ?? "other";

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function configurationAreas(sources: Source[], search = "") {
  const query = normalized(search.trim());
  const definitions = [...areas];
  const other = sources.filter((source) => !areas.some((area) => area.sources.includes(source.id)));
  if (other.length)
    definitions.push({
      id: "other",
      label: "Outras configurações",
      description: "Fontes disponíveis neste ambiente",
      sources: other.map((source) => source.id),
    });
  return definitions
    .map((area) => ({
      ...area,
      items: area.sources.flatMap((id) => {
        const source = sources.find((item) => item.id === id);
        return source &&
          (!query ||
            normalized(
              `${area.label} ${area.description} ${source.label} ${source.id} ${sourceDescription(source)}`,
            ).includes(query))
          ? [source]
          : [];
      }),
    }))
    .filter((area) => area.items.length);
}

export function resourceLabel(sourceId?: string) {
  if (sourceId === "channels") return "Canal";
  if (sourceId === "storage") return "Armazenamento";
  return "Registro";
}
