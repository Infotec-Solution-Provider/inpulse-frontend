import { ShowingMessagesType } from "@/lib/reducers/chats-filter.reducer";
import { FilterList } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { IconButton, Menu, MenuItem, Popover, TextField } from "@mui/material";
import { useContext, useState } from "react";
import { AppContext } from "../../app-context";
import { WhatsappContext } from "../../whatsapp-context";
import StartChatModal from "./(start-chat-modal)/start-chat-modal";
import CategoryIcon from "@mui/icons-material/Category";
import StartInternalChatModal from "./(start-internal-chat-modal)/start-internal-chat-modal";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";

const SHOWING_TYPE_TEXT: Record<ShowingMessagesType, string> = {
  all: "",
  unread: "(Lidas)",
  scheduled: "(Agendadas)",
  internal: "(Internas)",
};

export default function ChatsMenuFilters() {
  const { changeChatFilters, chatFilters } = useContext(WhatsappContext);

  // Estado para abrir o menu do botão "+"
  const [startMenuAnchorEl, setStartMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Estado para abrir o popover da "Nova Conversa Interna"
  const [internalChatAnchorEl, setInternalChatAnchorEl] = useState<null | HTMLElement>(null);

  // Estado para abrir menu de filtros
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Estado para abrir o popover da "Nova Conversa Interna"
  const [chatAnchorEl, setChatAnchorEl] = useState<null | HTMLElement>(null);

  // Estado para abrir menu de filtros

  const isStartMenuOpen = Boolean(startMenuAnchorEl);
  const isInternalChatOpen = Boolean(internalChatAnchorEl);
  const isChatOpen = Boolean(chatAnchorEl);
  const isFilterMenuOpen = Boolean(filterMenuAnchorEl);

  // Abrir menu "+"
  const handleStartMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setStartMenuAnchorEl(event.currentTarget);
  };

  // Fechar menu "+"
  const handleStartMenuClose = () => {
    setStartMenuAnchorEl(null);
  };

  // Abrir popover da "Nova Conversa Interna" e fechar menu "+"
  const handleOpenInternalChat = (event: React.MouseEvent<HTMLElement>) => {
    setInternalChatAnchorEl(event.currentTarget);
    handleStartMenuClose();
  };
    // Abrir popover da "Nova Conversa " e fechar menu "+"

  const handleOpenStartChatModal = (event: React.MouseEvent<HTMLElement>) => {
    setChatAnchorEl(event.currentTarget);
    handleStartMenuClose();
  };
  // Fechar popover da "Nova Conversa "
  const handleCloseInternalChat = () => {
    setInternalChatAnchorEl(null);
  };
  // Fechar popover da "Nova Conversa Interna"
  const handleCloseChat = () => {
    setChatAnchorEl(null);
  };
/*   // Abrir modal "Nova Conversa" e fechar menu "+"
  const handleOpenStartChatModal = () => {
    openModal(<StartChatModal />);
    handleStartMenuClose();
  }; */

  // Abrir menu filtros
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };

  // Fechar menu filtros
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

  return (
    <div className="flex flex-col gap-1 rounded-t-md p-3">
      <header className="mb-1 flex w-full items-center justify-between font-semibold dark:font-normal">
        <h1>Conversas {SHOWING_TYPE_TEXT[chatFilters.showingType]}</h1>
        <div className="flex items-center gap-2">
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
          anchorEl={startMenuAnchorEl}
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

          <MenuItem onClick={handleOpenInternalChat} className="flex items-center gap-2">
            <SmsIcon />
            <p>Nova Conversa Interna</p>
          </MenuItem>
        </Menu>

        <Popover
          open={isChatOpen }
          anchorEl={chatAnchorEl}
          onClose={handleCloseChat}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{ style: { width: 350 } }}
        >
          <StartChatModal onClose={handleCloseChat} />
        </Popover>

        <Popover
          open={isInternalChatOpen }
          anchorEl={internalChatAnchorEl}
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
        </Menu>
      </header>

      <TextField label="Pesquisar conversa" className="grow" onChange={handleChangeText} />
    </div>
  );
}
