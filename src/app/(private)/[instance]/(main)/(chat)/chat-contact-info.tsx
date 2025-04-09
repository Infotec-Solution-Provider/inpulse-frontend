import { ChatUrgency } from "@/lib/types/chats.types";
import { Formatter } from "@in.pulse-crm/utils";
import { Avatar, MenuItem, Select } from "@mui/material";

export interface ChatContactInfoProps {
  name: string;
  avatarUrl?: string | null;
  company: string;
  phone: string;
  cnpj: string;
  id: number;
  erpId: string;
  startDate: string;
  urgency: ChatUrgency;
  allowedUrgency: ChatUrgency[];
}

const URGENCY_TEXT: Record<ChatUrgency, string> = {
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export default function ChatContactInfo({
  name,
  company,
  phone,
  cnpj,
  id,
  erpId,
  startDate,
  allowedUrgency,
  urgency,
  avatarUrl,
}: ChatContactInfoProps) {
  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-4 p-2">
        <Avatar variant="rounded" alt={name} src={avatarUrl || ""} sx={{ width: 64, height: 64 }} />
        <div>
          <p>{name}</p>
          <p>{company}</p>
          <p>{Formatter.phone(phone)}</p>
        </div>
      </div>
      <div>
        <p>
          <b>CNPJ/CPF: </b>
          {cnpj}
        </p>
        <p>
          <b>Código: </b>{id}
        </p>
        <p>
          <b>Código ERP: </b>{erpId}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p>
          <b>Data Início: </b>
          {new Date(startDate).toLocaleDateString("pt-BR")}
        </p>
        <Select
          size="small"
          sx={{ width: 176 }}
          value={urgency}
          label="Urgência"
          variant="outlined"
        >
          {allowedUrgency.map((urgency) => (
            <MenuItem key={urgency} value={urgency}>
              {URGENCY_TEXT[urgency]}
            </MenuItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
