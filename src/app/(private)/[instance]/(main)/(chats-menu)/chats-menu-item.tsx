import { AuthContext } from "@/app/auth-context";
import { Avatar, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { Check, Mail, Pin } from "lucide-react";
import { ReactNode, useContext, useMemo, useState } from "react";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { InternalChatContext } from "../../internal-context";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import ChatsMenuItemTag from "./chats-menu-item-tag";

interface Tag {
  name: string;
  color: string;
}

interface ChatsMenuItemProps {
  name: string;
  customer?: string;
  avatar?: string;
  message: ReactNode;
  messageDate: Date | null;
  tags: Tag[];
  isUnread?: boolean;
  isOpen?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onToggleUnread?: () => void;
  onClick?: () => void;
}

export default function ChatsMenuItem({
  name,
  avatar,
  message,
  messageDate,
  tags,
  customer,
  isUnread,
  isOpen,
  onClick,
  isPinned,
  onTogglePin,
  onToggleUnread,
}: ChatsMenuItemProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { user } = useContext(AuthContext);
  const { users } = useContext(InternalChatContext);
  const { state } = useContext(ContactsContext);
  const lastMessageDateText = useMemo(() => {
    if (!messageDate || Number.isNaN(messageDate.getTime())) return null;
    if (messageDate.toDateString() === new Date().toDateString()) {
      return messageDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return messageDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }, [messageDate]);

  function wasMentioned(text: string): boolean {
    const matches = text.match(/@(\d{6,})/g);
    if (!matches) return false;
    const mentionedPhones = matches.map((match) => match.replace("@", ""));
    const userPhones = new Set<string>();
    if (user?.WHATSAPP) userPhones.add(user.WHATSAPP.replace(/\D/g, ""));
    const matchUser = users.find((candidate) => candidate.CODIGO === user?.CODIGO);
    if (matchUser?.WHATSAPP) userPhones.add(matchUser.WHATSAPP.replace(/\D/g, ""));
    for (const contact of state.contacts) {
      if (contact.id === user?.CODIGO && contact.phone) {
        userPhones.add(contact.phone.replace(/\D/g, ""));
      }
    }
    return mentionedPhones.some((phone) => userPhones.has(phone));
  }

  return (
    <div
      role="listitem"
      className="attendance-conversation-item"
      data-selected={Boolean(isOpen)}
      data-unread={Boolean(isUnread)}
    >
      <button
        type="button"
        className="attendance-conversation-open"
        aria-current={isOpen ? "true" : undefined}
        onClick={onClick}
        data-testid="chat-menu-item"
        data-clickable="true"
      >
        <span className="attendance-conversation-avatar">
          <Avatar component="span" alt="" src={avatar || ""} sx={{ width: 40, height: 40 }}>
            {name.trim().charAt(0).toUpperCase()}
          </Avatar>
          {isUnread && <span className="attendance-unread-dot" aria-hidden="true" />}
        </span>
        <span className="attendance-conversation-copy">
          <span className="attendance-conversation-identity">
            <span className="attendance-conversation-name" title={name}>
              {name}
            </span>
            {isPinned && <UiIcon icon={Pin} scale="metadata" aria-label="Conversa fixada" />}
            {lastMessageDateText && (
              <time
                dateTime={messageDate!.toISOString()}
                title={messageDate!.toLocaleString("pt-BR")}
                className="attendance-conversation-time"
              >
                {lastMessageDateText}
              </time>
            )}
          </span>
          {customer && customer !== name && (
            <span className="attendance-conversation-customer" title={customer}>
              {customer}
            </span>
          )}
          <span className="attendance-conversation-preview font-emoji">{message}</span>
          {tags.length > 0 && (
            <span className="attendance-conversation-tags">
              {tags.map((tag) => (
                <ChatsMenuItemTag key={tag.name} name={tag.name} color={tag.color} />
              ))}
            </span>
          )}
          {isUnread && <span className="sr-only">Não lida</span>}
          {isUnread && typeof message === "string" && wasMentioned(message) && (
            <span className="attendance-conversation-mention">Você foi mencionado</span>
          )}
        </span>
      </button>
      {(onTogglePin || onToggleUnread) && (
        <div className="attendance-conversation-more">
          <OperationalIconButton
            label={`Mais ações da conversa de ${name}`}
            tooltip="Mais ações"
            aria-haspopup="menu"
            aria-expanded={Boolean(menuAnchor)}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            <UiIcon name="more" scale="row" />
          </OperationalIconButton>
        </div>
      )}
      {/* O menu fica fora da ação de abrir, preservando a leitura explícita da conversa. */}
      {(onTogglePin || onToggleUnread) && (
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          {onTogglePin && (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                onTogglePin();
              }}
            >
              <ListItemIcon>
                <UiIcon icon={Pin} scale="row" />
              </ListItemIcon>
              <ListItemText>{isPinned ? "Desafixar conversa" : "Fixar conversa"}</ListItemText>
            </MenuItem>
          )}
          {onToggleUnread && (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                onToggleUnread();
              }}
            >
              <ListItemIcon>
                <UiIcon icon={isUnread ? Check : Mail} scale="row" />
              </ListItemIcon>
              <ListItemText>{isUnread ? "Marcar como lida" : "Marcar como não lida"}</ListItemText>
            </MenuItem>
          )}
        </Menu>
      )}
    </div>
  );
}
