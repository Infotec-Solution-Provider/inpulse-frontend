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
  startDate: Date;
  urgency: ChatUrgency;
}

export default function ChatHeader({
  name,
  company,
  phone,
  cnpj,
  id,
  erpId,
  startDate,
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
          <b>Código: </b>
          {id}
        </p>
        <p>
          <b>Código ERP: </b>
          {erpId}
        </p>
      </div>
    </div>
  );
}
