export type ChangelogCategory = "novidade" | "melhoria" | "correcao";

export interface ChangelogEntry {
  date: string;
  category: ChangelogCategory;
  title: string;
  description: string;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "06/08/2026",
    category: "novidade",
    title: "Central de novidades",
    description: "Administradores agora podem acompanhar as novidades, correções e melhorias do Inpulse em um só lugar.",
  },
  {
    date: "31/07/2026",
    category: "melhoria",
    title: "Grupos internos mais claros",
    description: "A organização dos participantes e do grupo WhatsApp vinculado ficou mais simples de consultar e administrar.",
  },
  {
    date: "31/07/2026",
    category: "correcao",
    title: "Mensagens de grupos internos",
    description: "Corrigida a identificação do autor nas mensagens trocadas em grupos internos.",
  },
  {
    date: "24/07/2026",
    category: "melhoria",
    title: "Experiência de atendimento",
    description: "A navegação entre conversas e recursos administrativos recebeu ajustes de estabilidade e usabilidade.",
  },
];

