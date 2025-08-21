import { ShowingMessagesType } from "@/lib/reducers/chats-filter.reducer";
import { FilterList } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { IconButton, Menu, MenuItem, Popover, TextField } from "@mui/material";
import { useContext, useState } from "react";
import { AppContext, useAppContext } from "../../app-context";
import { WhatsappContext } from "../../whatsapp-context";
import StartChatModal from "./(start-chat-modal)/start-chat-modal";
import CategoryIcon from "@mui/icons-material/Category";
import StartInternalChatModal from "./(start-internal-chat-modal)/start-internal-chat-modal";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SchedulesModal from "./(schedules-modal)/schedules-modal";
import HailIcon from "@mui/icons-material/Hail";

const SHOWING_TYPE_TEXT: Record<ShowingMessagesType, string> = {
  all: "",
  unread: "(Lidas)",
  scheduled: "(Agendadas)",
  internal: "(Internas)",
  external: "(Clientes)",
};

export default function ChatsMenuFilters() {
  const { openModal, closeModal } = useAppContext();
  const { changeChatFilters, chatFilters, parameters } = useContext(WhatsappContext);

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

  const handleOpenStartChatModal = (event: React.MouseEvent<HTMLElement>) => {
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
          <MenuItem onClick={handleOpenStartChatModal} className="flex items-center gap-2">
            <WhatsAppIcon />
            <p>Nova Conversa</p>
          </MenuItem>

          {parameters["disable_internal_chats"] !== "true" && (
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
          PaperProps={{ style: { width: 350 } }}
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
          <MenuItem
            onClick={() => handleChangeShowingType("all")}
            aria-hidden={chatFilters.showingType === "all"}
            className="flex items-center gap-2"
          >
            <CategoryIcon />
            <p>Todas</p>
          </MenuItem>
          <MenuItem
            onClick={() => handleChangeShowingType("unread")}
            aria-hidden={chatFilters.showingType === "unread"}
            className="flex items-center gap-2"
          >
            <MarkChatUnreadIcon />
            <p>Não lidas</p>
          </MenuItem>
          <MenuItem
            onClick={() => handleChangeShowingType("scheduled")}
            aria-hidden={chatFilters.showingType === "scheduled"}
            className="flex items-center gap-2"
          >
            <ScheduleIcon />
            <p>Agendados</p>
          </MenuItem>
          <MenuItem
            onClick={() => handleChangeShowingType("internal")}
            aria-hidden={chatFilters.showingType === "internal"}
            className="flex items-center gap-2"
          >
            <GroupsIcon />
            <p>Internos</p>
          </MenuItem>
          <MenuItem
            onClick={() => handleChangeShowingType("external")}
            aria-hidden={chatFilters.showingType === "external"}
            className="flex items-center gap-2"
          >
            <HailIcon />
            <p>Clientes</p>
          </MenuItem>
        </Menu>
      </header>

      <TextField label="Pesquisar conversa" className="grow" onChange={handleChangeText} />
    </div>
  );
}
