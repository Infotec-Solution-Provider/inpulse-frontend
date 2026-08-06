"use client";

import { ShowingMessagesType } from "@/lib/reducers/chats-filter.reducer";
import { FilterList } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryIcon from "@mui/icons-material/Category";
import GroupsIcon from "@mui/icons-material/Groups";
import HailIcon from "@mui/icons-material/Hail";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SmsIcon from "@mui/icons-material/Sms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Popover,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/app/auth-context";
import { useAppContext } from "../../app-context";
import { useWhatsappChatList } from "../../whatsapp-chat-list-context";
import { canAccessInternalChats, isExternalOperator } from "@/lib/permissions/operator-access";
import dynamic from "next/dynamic";

const SchedulesModal = dynamic(() => import("./(schedules-modal)/schedules-modal"), { ssr: false });
const StartChatModal = dynamic(() => import("./(start-chat-modal)/start-chat-modal"), {
  ssr: false,
});
const StartInternalChatModal = dynamic(
  () => import("./(start-internal-chat-modal)/start-internal-chat-modal"),
  { ssr: false },
);

const SHOWING_TYPE_TEXT: Record<ShowingMessagesType, string> = {
  all: "",
  unread: "(Lidas)",
  scheduled: "(Agendadas)",
  internal: "(Internas)",
  external: "(Clientes)",
};

export default function ChatsMenuFilters() {
  const { openModal, closeModal } = useAppContext();
  const { user } = useContext(AuthContext);
  const { changeChatFilters, chatFilters, parameters } = useWhatsappChatList();
  const isExternal = isExternalOperator(user?.NIVEL);
  const canStartInternalChat = canAccessInternalChats(parameters, user?.NIVEL);

  const [newChatMenuAnchorEl, setNewChatMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [newInternalChatAnchorEl, setNewInternalChatAnchorEl] = useState<null | HTMLElement>(null);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState<null | HTMLElement>(null);

  const isStartMenuOpen = Boolean(newChatMenuAnchorEl);
  const isInternalChatOpen = Boolean(newInternalChatAnchorEl);
  const isFilterMenuOpen = Boolean(filterMenuAnchorEl);

  const handleStartMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNewChatMenuAnchorEl(event.currentTarget);
  };

  const handleStartMenuClose = () => {
    setNewChatMenuAnchorEl(null);
  };

  const handleOpenInternalChat = (event: React.MouseEvent<HTMLElement>) => {
    setNewInternalChatAnchorEl(event.currentTarget);
    handleStartMenuClose();
  };

  const handleOpenStartChatModal = () => {
    openModal(<StartChatModal onClose={closeModal} />);
    handleStartMenuClose();
  };

  const handleCloseInternalChat = () => {
    setNewInternalChatAnchorEl(null);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
  };

  const handleChangeShowingType = (showingType: ShowingMessagesType) => {
    changeChatFilters({ type: "change-showing-type", showingType });
    handleFilterMenuClose();
  };

  const handleChangeText = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeChatFilters({ type: "change-search", search: event.target.value });
  };

  const handleSchedulesMenuOpen = () => {
    openModal(<SchedulesModal onClose={closeModal} />);
  };

  const handleChangeSortBy = (event: SelectChangeEvent) => {
    const value = event.target.value as any;
    changeChatFilters({ type: "change-sort-by", sortBy: value });
  };

  const handleChangeSortOrder = (event: SelectChangeEvent) => {
    const value = event.target.value as any;
    changeChatFilters({ type: "change-sort-order", sortOrder: value });
  };

  useEffect(() => {
    if (isExternal && chatFilters.showingType !== "internal") {
      changeChatFilters({ type: "change-showing-type", showingType: "internal" });
    }
  }, [isExternal, chatFilters.showingType, changeChatFilters]);

  return (
    <div className="flex flex-col gap-1 rounded-t-md p-3">
      <header className="mb-1 flex w-full items-center justify-between font-semibold dark:font-normal">
        <h1>Conversas {SHOWING_TYPE_TEXT[chatFilters.showingType]}</h1>
        <div className="flex items-center gap-2">
          <IconButton id="schedules-button" onClick={handleSchedulesMenuOpen}>
            <CalendarMonthIcon />
          </IconButton>

          <IconButton id="filter-chats-button" onClick={handleFilterMenuOpen}>
            <FilterList />
          </IconButton>

          <IconButton id="start-button" onClick={handleStartMenuOpen}>
            <AddIcon />
          </IconButton>
        </div>

        {/* Menu do botão "+" */}
        <Menu
          id="start-menu"
          anchorEl={newChatMenuAnchorEl}
          open={isStartMenuOpen}
          onClose={handleStartMenuClose}
          PaperProps={{
            sx: {
              bgcolor: "background.paper",
              color: "text.primary",
            },
          }}
        >
          {!isExternal && (
            <MenuItem onClick={handleOpenStartChatModal} className="flex items-center gap-2">
              <WhatsAppIcon />
              <p>Nova Conversa</p>
            </MenuItem>
          )}

          {canStartInternalChat && (
            <MenuItem onClick={handleOpenInternalChat} className="flex items-center gap-2">
              <SmsIcon />
              <p>Nova Conversa Interna</p>
            </MenuItem>
          )}
        </Menu>

        <Popover
          open={isInternalChatOpen}
          anchorEl={newInternalChatAnchorEl}
          onClose={handleCloseInternalChat}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{ sx: { width: 350, maxWidth: "calc(100vw - 24px)" } }}
        >
          <StartInternalChatModal onClose={handleCloseInternalChat} />
        </Popover>
        {/* Menu filtros */}
        <Menu
          id="filter-menu"
          anchorEl={filterMenuAnchorEl}
          open={isFilterMenuOpen}
          onClose={handleFilterMenuClose}
        >
          {!isExternal && [
            <MenuItem
              key="all"
              onClick={() => handleChangeShowingType("all")}
              aria-hidden={chatFilters.showingType === "all"}
              className="flex items-center gap-2"
            >
              <CategoryIcon />
              <p>Todas</p>
            </MenuItem>,
            <MenuItem
              key="unread"
              onClick={() => handleChangeShowingType("unread")}
              aria-hidden={chatFilters.showingType === "unread"}
              className="flex items-center gap-2"
            >
              <MarkChatUnreadIcon />
              <p>Não lidas</p>
            </MenuItem>,
            <MenuItem
              key="scheduled"
              onClick={() => handleChangeShowingType("scheduled")}
              aria-hidden={chatFilters.showingType === "scheduled"}
              className="flex items-center gap-2"
            >
              <ScheduleIcon />
              <p>Agendados</p>
            </MenuItem>,
          ]}
          <MenuItem
            onClick={() => handleChangeShowingType("internal")}
            aria-hidden={chatFilters.showingType === "internal"}
            className="flex items-center gap-2"
          >
            <GroupsIcon />
            <p>Internos</p>
          </MenuItem>
          {!isExternal && (
            <MenuItem
              onClick={() => handleChangeShowingType("external")}
              aria-hidden={chatFilters.showingType === "external"}
              className="flex items-center gap-2"
            >
              <HailIcon />
              <p>Clientes</p>
            </MenuItem>
          )}
        </Menu>
      </header>

      <div className="flex gap-2">
        <TextField
          id="chats-search"
          label="Pesquisar conversa"
          className="grow"
          onChange={handleChangeText}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <FormControl fullWidth size="small">
          <InputLabel id="sort-by-label">Ordenar por</InputLabel>
          <Select
            labelId="sort-by-label"
            id="sort-by-select"
            value={chatFilters.sortBy}
            label="Ordenar por"
            onChange={handleChangeSortBy}
          >
            <MenuItem value="startedAt">Data de início</MenuItem>
            <MenuItem value="finishedAt">Data de finalização</MenuItem>
            <MenuItem value="lastMessage">Data da última mensagem</MenuItem>
            <MenuItem value="userCreator">Nome</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel id="sort-order-label">Ordem</InputLabel>
          <Select
            labelId="sort-order-label"
            id="sort-order-select"
            value={chatFilters.sortOrder}
            label="Ordem"
            onChange={handleChangeSortOrder}
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </Select>
        </FormControl>
      </div>
    </div>
  );
}
