import { MessageTemplate, useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useAuthContext } from "@/app/auth-context";
import { Customer, WppContact } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import { Autocomplete, Button, IconButton, TextField } from "@mui/material";
import { useEffect, useState } from "react";
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

  const gupshupTemplateText = selectedTemplate?.text.replace(/{{\d+}}/g, (match) => {
    const key = match.replaceAll("{", "").replaceAll("}", "");
    return variables[+key] || match; // Se não houver valor, mostra o placeholder original
  });

  const wabaTemplateText = selectedTemplate?.text;

  const templateText =
    selectedTemplate?.source === "gupshup" ? gupshupTemplateText : wabaTemplateText;

  useEffect(() => {
    if (!selectedTemplate) {
      setVariables({});
    } else {
      const matches = selectedTemplate.text.match(/{{\d+}}/g) || [];

      const newVariables = matches.reduce((a, b) => {
        const number = +b.replaceAll("{", "").replaceAll("}", "");
        a = { ...a, [number]: "" };
        return a;
      }, {});

      setVariables(newVariables);
    }
  }, [selectedTemplate]);

  const hasVariables = Object.keys(variables).length > 0;

  const disabled = !selectedTemplate || (hasVariables && Object.values(variables).some((v) => !v));

  const handleSend = () => {
    if (onSendTemplate && selectedTemplate && templateText) {
      onSendTemplate({
        template: selectedTemplate,
        components: Object.values(variables),
        templateVariables: {
          atendente_nome: user!.NOME,
          atendente_nome_exibição: user!.NOME_EXIBICAO || "vendedor",
          cliente_cnpj: customer?.CPF_CNPJ || "000.000.000-00",
          cliente_razao: customer?.RAZAO || "CLIENTE NÃO CADASTRADO",
          contato_nome_completo: getFullName(contact?.name) || "Contato Nome Completo",
          contato_primeiro_nome: getFirstName(contact?.name) || "Contato",
          saudação_tempo: "Saudação Tempo",
        },
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
          getOptionLabel={(option) => (option?.name || option?.id || "").toString()}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          // Evita tentar renderizar objeto direto caso API retorne algo inesperado
          filterOptions={(options, state) =>
            options.filter((opt) =>
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
                  .map((line, idx) => (
                    <p key={idx}>{typeof line === "string" ? line : JSON.stringify(line)}</p>
                  ))}
              {selectedTemplate.source === "waba" &&
                templateText?.split("\n").map((line, idx) => <p key={idx}>{line}</p>)}
            </div>
            {hasVariables && (
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
