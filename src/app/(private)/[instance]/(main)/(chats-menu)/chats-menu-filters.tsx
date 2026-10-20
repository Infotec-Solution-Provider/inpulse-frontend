"use client";

import type { ChatsFiltersState, ShowingMessagesType } from "@/lib/reducers/chats-filter.reducer";
import {
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Popover,
  Select,
  TextField,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/app/auth-context";
import { useAppContext } from "../../app-context";
import { useWhatsappChatList } from "../../whatsapp-chat-list-context";
import { canAccessInternalChats, isExternalOperator } from "@/lib/permissions/operator-access";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { OperationalPanel } from "@/lib/ui-system/components";
import { UiIcon } from "@/lib/ui-system/icons";
import dynamic from "next/dynamic";
import ChatTypeCarousel from "./chat-type-carousel";

const SchedulesModal = dynamic(() => import("./(schedules-modal)/schedules-modal"), { ssr: false });
const StartChatModal = dynamic(() => import("./(start-chat-modal)/start-chat-modal"), {
  ssr: false,
});
const StartInternalChatModal = dynamic(
  () => import("./(start-internal-chat-modal)/start-internal-chat-modal"),
  { ssr: false },
);

const CHAT_TYPES: { value: ShowingMessagesType; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Não lidas" },
  { value: "external", label: "Clientes" },
  { value: "internal", label: "Internas" },
  { value: "scheduled", label: "Agendadas" },
];
const SORT_LABELS: Record<ChatsFiltersState["sortBy"], string> = {
  lastMessage: "Última mensagem",
  startedAt: "Data de início",
  finishedAt: "Data de finalização",
  userCreator: "Responsável ou criador",
};

export default function ChatsMenuFilters() {
  const { openModal, closeModal } = useAppContext();
  const { user } = useContext(AuthContext);
  const { changeChatFilters, chatFilters, parameters } = useWhatsappChatList();
  const isExternal = isExternalOperator(user?.NIVEL);
  const canStartInternalChat = canAccessInternalChats(parameters, user?.NIVEL);
  const [newChatMenuAnchorEl, setNewChatMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [newInternalChatAnchorEl, setNewInternalChatAnchorEl] = useState<HTMLElement | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState(chatFilters);
  const availableTypes = isExternal
    ? CHAT_TYPES.filter((type) => type.value === "internal")
    : CHAT_TYPES;

  const openFilters = () => {
    setDraft(chatFilters);
    setFiltersOpen(true);
  };
  const cancelFilters = () => {
    setDraft(chatFilters);
    setFiltersOpen(false);
  };
  const applyFilters = () => {
    changeChatFilters({
      type: "change-showing-type",
      showingType: isExternal ? "internal" : draft.showingType,
    });
    changeChatFilters({ type: "change-sort-by", sortBy: draft.sortBy });
    changeChatFilters({ type: "change-sort-order", sortOrder: draft.sortOrder });
    setFiltersOpen(false);
  };

  useEffect(() => {
    if (isExternal && chatFilters.showingType !== "internal") {
      changeChatFilters({ type: "change-showing-type", showingType: "internal" });
    }
  }, [isExternal, chatFilters.showingType, changeChatFilters]);

  return (
    <div className="attendance-conversation-filters">
      <header className="attendance-conversation-heading">
        <h1>Conversas</h1>
        <div className="attendance-conversation-actions">
          <OperationalIconButton
            id="schedules-button"
            label="Consultar agendamentos"
            tooltip="Agendamentos"
            onClick={() => openModal(<SchedulesModal onClose={closeModal} />)}
          >
            <UiIcon name="calendar" scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton
            id="filter-chats-button"
            label="Filtrar e ordenar conversas"
            tooltip="Filtros e ordenação"
            onClick={openFilters}
          >
            <UiIcon name="filter" scale="toolbar" />
          </OperationalIconButton>
          {(!isExternal || canStartInternalChat) && (
            <OperationalIconButton
              id="start-button"
              label="Iniciar conversa"
              aria-haspopup="menu"
              aria-controls={newChatMenuAnchorEl ? "start-menu" : undefined}
              aria-expanded={Boolean(newChatMenuAnchorEl)}
              onClick={(event) => setNewChatMenuAnchorEl(event.currentTarget)}
            >
              <UiIcon name="add" scale="toolbar" />
            </OperationalIconButton>
          )}
        </div>
      </header>

      <TextField
        id="chats-search"
        label="Buscar conversa"
        placeholder="Nome, telefone ou documento"
        value={chatFilters.search}
        fullWidth
        size="small"
        onChange={(event) =>
          changeChatFilters({ type: "change-search", search: event.target.value })
        }
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <UiIcon name="search" scale="row" />
              </InputAdornment>
            ),
            endAdornment: chatFilters.search ? (
              <InputAdornment position="end">
                <OperationalIconButton
                  label="Limpar busca de conversas"
                  onClick={() => changeChatFilters({ type: "change-search", search: "" })}
                >
                  <UiIcon name="close" scale="metadata" />
                </OperationalIconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      <ChatTypeCarousel
        options={availableTypes}
        value={chatFilters.showingType}
        onChange={(showingType) => changeChatFilters({ type: "change-showing-type", showingType })}
      />
      <div className="attendance-conversation-order">
        <UiIcon name="sort" scale="metadata" />
        <span>
          {SORT_LABELS[chatFilters.sortBy]} ·{" "}
          {chatFilters.sortBy === "userCreator"
            ? chatFilters.sortOrder === "asc"
              ? "A–Z"
              : "Z–A"
            : chatFilters.sortOrder === "desc"
              ? "Mais recentes"
              : "Mais antigas"}
        </span>
      </div>

      <Menu
        id="start-menu"
        anchorEl={newChatMenuAnchorEl}
        open={Boolean(newChatMenuAnchorEl)}
        onClose={() => setNewChatMenuAnchorEl(null)}
      >
        {!isExternal && (
          <MenuItem
            onClick={() => {
              openModal(<StartChatModal onClose={closeModal} />);
              setNewChatMenuAnchorEl(null);
            }}
          >
            <UiIcon name="conversations" scale="row" />
            <span className="ml-3">Nova conversa com cliente</span>
          </MenuItem>
        )}
        {canStartInternalChat && (
          <MenuItem
            onClick={() => {
              setNewInternalChatAnchorEl(newChatMenuAnchorEl);
              setNewChatMenuAnchorEl(null);
            }}
          >
            <UiIcon name="operator" scale="row" />
            <span className="ml-3">Nova conversa interna</span>
          </MenuItem>
        )}
      </Menu>

      <Popover
        open={Boolean(newInternalChatAnchorEl)}
        anchorEl={newInternalChatAnchorEl}
        onClose={() => setNewInternalChatAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 350, maxWidth: "calc(100vw - 24px)" } } }}
      >
        <StartInternalChatModal onClose={() => setNewInternalChatAnchorEl(null)} />
      </Popover>

      <OperationalPanel
        open={filtersOpen}
        title="Filtros de conversas"
        description="Escolha quais conversas exibir e como ordenar a lista."
        onClose={cancelFilters}
        footer={
          <>
            <Button color="inherit" onClick={cancelFilters}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={applyFilters}>
              Aplicar filtros
            </Button>
          </>
        }
      >
        <div className="attendance-filter-fields">
          <FormControl fullWidth size="small">
            <InputLabel id="conversation-type-label">Tipo de conversa</InputLabel>
            <Select
              labelId="conversation-type-label"
              id="conversation-type-select"
              label="Tipo de conversa"
              value={isExternal ? "internal" : draft.showingType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  showingType: event.target.value as ShowingMessagesType,
                }))
              }
            >
              {availableTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="sort-by-label">Ordenar por</InputLabel>
            <Select
              labelId="sort-by-label"
              id="sort-by-select"
              label="Ordenar por"
              value={draft.sortBy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sortBy: event.target.value as ChatsFiltersState["sortBy"],
                }))
              }
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="sort-order-label">Ordem</InputLabel>
            <Select
              labelId="sort-order-label"
              id="sort-order-select"
              label="Ordem"
              value={draft.sortOrder}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sortOrder: event.target.value as ChatsFiltersState["sortOrder"],
                }))
              }
            >
              <MenuItem value="asc">Crescente</MenuItem>
              <MenuItem value="desc">Decrescente</MenuItem>
            </Select>
          </FormControl>
        </div>
      </OperationalPanel>
    </div>
  );
}
