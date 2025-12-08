import { MessageTemplate, useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useAuthContext } from "@/app/auth-context";
import { Customer, WppContact } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import { Autocomplete, Button, IconButton, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { TemplateVariables } from "../types/chats.types";
import { getFirstName, getFullName } from "../utils/name";

export interface SendTemplateData {
  template: MessageTemplate;
  templateVariables: TemplateVariables;
  components: string[];
}

interface Props {
  onClose?: () => void;
  onSendTemplate?: (data: SendTemplateData) => void;
  contact?: WppContact | null;
  customer?: Customer | null;
}

export default function SendTemplateModal({ onClose, onSendTemplate, customer, contact }: Props) {
  const { templates } = useWhatsappContext();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<number, string>>({});
  const { user } = useAuthContext();

  const contactKey = useMemo(() => {
    if (contact?.id) return `contact:${contact.id}`;
    if (contact?.phone) return `phone:${contact.phone}`;
    if (customer?.CPF_CNPJ) return `customer:${customer.CPF_CNPJ}`;
    return null;
  }, [contact?.id, contact?.phone, customer?.CPF_CNPJ]);

  const templateVariablesValues: TemplateVariables = useMemo(
    () => ({
      atendente_nome: user?.NOME || "atendente",
      atendente_nome_exibição: user?.NOME_EXIBICAO || "vendedor",
      cliente_cnpj: customer?.CPF_CNPJ || "000.000.000-00",
      cliente_razao: customer?.RAZAO || "CLIENTE NÃO CADASTRADO",
      contato_nome_completo: getFullName(contact?.name) || "Contato Nome Completo",
      contato_primeiro_nome: getFirstName(contact?.name) || "Contato",
      saudação_tempo: "Saudação Tempo",
    }),
    [user?.NOME, user?.NOME_EXIBICAO, customer?.CPF_CNPJ, customer?.RAZAO, contact?.name],
  );

  const gupshupTemplateText = selectedTemplate?.text.replace(/{{\d+}}/g, (match: string) => {
    const key = match.replaceAll("{", "").replaceAll("}", "");
    return variables[+key] || match; // Se não houver valor, mostra o placeholder original
  });

  const wabaTemplateText = useMemo(() => {
    if (!selectedTemplate || selectedTemplate.source !== "waba" || !selectedTemplate.text) {
      return selectedTemplate?.text;
    }

    const bodyComponent = selectedTemplate.raw?.components?.find((c: any) => c.type === "BODY");
    const exampleValues: string[] | undefined = bodyComponent?.example?.body_text?.[0];

    return selectedTemplate.text.replace(/{{(\d+)}}/g, (_match: string, group: string) => {
      const index = Number(group) - 1;
      const exampleKey = exampleValues?.[index];
      const value = exampleKey
        ? templateVariablesValues[exampleKey as keyof TemplateVariables]
        : undefined;

      return value || exampleKey || `{{${group}}}`;
    });
  }, [selectedTemplate, templateVariablesValues]);

  const templateText =
    selectedTemplate?.source === "gupshup" ? gupshupTemplateText : wabaTemplateText;

  useEffect(() => {
    if (!selectedTemplate) {
      setVariables({});
    } else {
      const matches = selectedTemplate.text.match(/{{\d+}}/g) || [];

      const newVariables = matches.reduce<Record<number, string>>((acc, current) => {
        const number = +current.replaceAll("{", "").replaceAll("}", "");
        acc[number] = "";
        return acc;
      }, {} as Record<number, string>);

      setVariables(newVariables);
    }
  }, [selectedTemplate]);

  const disabled =
    !selectedTemplate ||
    (selectedTemplate.source !== "waba" && Object.values(variables).some((v) => !v));

  const TEMPLATE_LIMIT = 2;
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "template-send-history-v1";

  const readHistory = (): Record<string, number[]> => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, number[]>;
    } catch {
      return {};
    }
  };

  const saveHistory = (history: Record<string, number[]>) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  };

  const handleSend = () => {
    if (onSendTemplate && selectedTemplate && templateText) {
      if (contactKey) {
        const now = Date.now();
        const history = readHistory();
        const pruned = (history[contactKey] || []).filter((ts) => now - ts < WINDOW_MS);

        if (pruned.length >= TEMPLATE_LIMIT) {
          toast.warn("Limite de 2 templates nas últimas 24h para este cliente.");
          saveHistory({ ...history, [contactKey]: pruned });
          return;
        }

        history[contactKey] = [...pruned, now];
        saveHistory(history);
      }

      onSendTemplate({
        template: selectedTemplate,
        components: Object.values(variables),
        templateVariables: templateVariablesValues,
      });
    }
  };

  return (
    <div className="w-[40rem] rounded-md bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
      <header className="flex w-full items-center justify-between p-2">
        <h1>Enviar Template</h1>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      <div className="p-2">
        <Autocomplete
          options={templates}
          onChange={(_, value) => setSelectedTemplate(value || null)}
          renderInput={(p) => <TextField label="Template" {...p} />}
          // Garantir label textual; fallback para id se name ausente
          getOptionLabel={(option: MessageTemplate) => (option?.name || option?.id || "").toString()}
          isOptionEqualToValue={(option: MessageTemplate, value: MessageTemplate) => option.id === value.id}
          // Evita tentar renderizar objeto direto caso API retorne algo inesperado
          filterOptions={(options, state) =>
            options.filter((opt: MessageTemplate) =>
              (opt.name || opt.id || "")
                .toString()
                .toLowerCase()
                .includes(state.inputValue.toLowerCase()),
            )
          }
        />
      </div>
      <div className="p-2">
        {selectedTemplate && (
          <>
            <div className="mb-2 bg-slate-300 p-2 dark:bg-slate-700">
              {selectedTemplate.source === "gupshup" &&
                typeof templateText === "string" &&
                templateText
                  .split("\n")
                  .map((line: string, idx: number) => (
                    <p key={idx}>{typeof line === "string" ? line : JSON.stringify(line)}</p>
                  ))}
              {selectedTemplate.source === "waba" &&
                templateText?.split("\n").map((line: string, idx: number) => <p key={idx}>{line}</p>)}
            </div>
            {selectedTemplate.source !== "waba" && (
              <div className="flex flex-col gap-2">
                {Object.entries(variables).map(([key, value]) => (
                  <TextField
                    size="small"
                    key={key}
                    value={value}
                    onChange={(e) => setVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                    label={`Variável ${key}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 p-2">
        <Button variant="outlined" color="error" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="outlined" color="success" onClick={handleSend} disabled={disabled}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
