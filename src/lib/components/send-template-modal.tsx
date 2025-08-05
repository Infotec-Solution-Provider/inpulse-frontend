import { Autocomplete, Button, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MessageTemplate, useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useEffect, useState } from "react";

export interface SendTemplateData {
  templateId: string;
  templateParams: Array<string>;
  templateText: string;
}

interface Props {
  onClose?: () => void;
  onSendTemplate?: (data: SendTemplateData) => void;
}

export default function SendTemplateModal({ onClose, onSendTemplate }: Props) {
  const { templates } = useWhatsappContext();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<number, string>>({});

  const templateText = selectedTemplate?.text.replace(/{{\d+}}/g, (match) => {
    const key = match.replaceAll("{", "").replaceAll("}", "");
    return variables[+key] || match; // Se não houver valor, mostra o placeholder original
  });

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

  // Mapeia os templates para o formato usado no Autocomplete
  const templateOptions = templates.map((t) => ({
    label: t.name,
    template: t,
  }));

  // Encontra a opção selecionada (usado para o value do Autocomplete)
  const selectedOption = selectedTemplate
    ? (templateOptions.find((opt) => opt.template.id === selectedTemplate.id) ?? null)
    : null;

  const disabled = !selectedTemplate || Object.values(variables).some((v) => !v);

  const handleSend = () => {
    if (onSendTemplate && selectedTemplate && templateText) {
      onSendTemplate({
        templateId: selectedTemplate.id,
        templateParams: Object.values(variables),
        templateText,
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
          options={templateOptions}
          onChange={(_, value) => setSelectedTemplate(value?.template || null)}
          value={selectedOption}
          renderInput={(p) => <TextField label="template" {...p} />}
        />
      </div>
      <div className="p-2">
        {selectedTemplate && (
          <>
            <div className="mb-2 bg-slate-300 p-2 dark:bg-slate-700">
              {templateText && templateText.split("\n").map((line, idx) => <p key={idx}>{line}</p>)}
            </div>
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
