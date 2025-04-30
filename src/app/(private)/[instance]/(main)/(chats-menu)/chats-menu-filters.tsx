import { ShowingMessagesType } from "@/lib/reducers/chats-filter.reducer";
import { FilterList } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { IconButton, Menu, MenuItem, TextField } from "@mui/material";
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
  const { openModal } = useContext(AppContext);
  const { changeChatFilters, chatFilters } = useContext(WhatsappContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isFilterMenuOpen = anchorEl?.id == "filter-chats-button";
  const isStartMenuOpen = anchorEl?.id == "start-button";

  const openFilterMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const openStartMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const openStartChatModal = () => {
    closeMenu();
    openModal(<StartChatModal />);
  };

  const openStartInternalChatModal = () => {
    closeMenu();
    openModal(<StartInternalChatModal />);
  };

  const closeMenu = () => setAnchorEl(null);

  const handleChangeShowingType = (showingType: ShowingMessagesType) => {
    changeChatFilters({ type: "change-showing-type", showingType });
    closeMenu();
  };

  const handleChangeText = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeChatFilters({ type: "change-search", search: event.target.value });
  };

  return (
    <div className="flex flex-col gap-1 rounded-t-md p-3">
      <header className="mb-1 flex w-full items-center justify-between">
        <h1>Conversas {SHOWING_TYPE_TEXT[chatFilters.showingType]}</h1>
        <div className="flex items-center gap-2">
          <IconButton id="filter-chats-button" onClick={openFilterMenu}>
            <FilterList />
          </IconButton>
          <IconButton id="start-button" onClick={openStartMenu}>
            <AddIcon />
          </IconButton>
        </div>
        {/* Menu de adicionar conversa/agendamento/chat interno*/}
        <Menu open={isStartMenuOpen} anchorEl={anchorEl} onClose={closeMenu}>
          <MenuItem className="flex items-center gap-2" onClick={openStartChatModal}>
            <WhatsAppIcon />
            <p>Nova Conversa</p>
          </MenuItem>
          <MenuItem className="flex items-center gap-2" onClick={openStartInternalChatModal}>
            <SmsIcon />
            <p>Nova Conversa Interna</p>
          </MenuItem>
        </Menu>

        {/* Menu de filtros de conversas */}
        <Menu open={isFilterMenuOpen} anchorEl={anchorEl} onClose={closeMenu}>
          <MenuItem
            className="flex items-center gap-2 aria-hidden:hidden"
            onClick={() => handleChangeShowingType("all")}
            aria-hidden={chatFilters.showingType === "all"}
          >
            <CategoryIcon />
            <p>Todas</p>
          </MenuItem>
          <MenuItem
            className="flex items-center gap-2 aria-hidden:hidden"
            onClick={() => handleChangeShowingType("unread")}
            aria-hidden={chatFilters.showingType === "unread"}
          >
            <MarkChatUnreadIcon />
            <p>Não lidas</p>
          </MenuItem>
          <MenuItem
            className="flex items-center gap-2 aria-hidden:hidden"
            onClick={() => handleChangeShowingType("scheduled")}
            aria-hidden={chatFilters.showingType === "scheduled"}
          >
            <ScheduleIcon />
            <p>Agendados</p>
          </MenuItem>
          <MenuItem
            className="flex items-center gap-2 aria-hidden:hidden"
            onClick={() => handleChangeShowingType("internal")}
            aria-hidden={chatFilters.showingType === "internal"}
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
