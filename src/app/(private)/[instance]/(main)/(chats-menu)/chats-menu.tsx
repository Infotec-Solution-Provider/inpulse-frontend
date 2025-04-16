"use client";
import { FilterList } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { IconButton, Menu, MenuItem, Pagination, TextField } from "@mui/material";
import { useCallback, useState } from "react";
import ChatsMenuItem from "./chats-menu-item";

export default function ChatsMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isFilterMenuOpen = anchorEl?.id == "filter-chats-button";
  const isAddChatMenuOpen = anchorEl?.id == "add-chat-button";

  const openFilterMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const openAddChatMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const closeMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <aside className="grid grid-rows-[auto_1fr_auto] flex-col rounded-md bg-slate-900 text-slate-300 drop-shadow-md">
      {/*  Header */}
      <div className="flex flex-col gap-1 rounded-t-md p-3">
        <header className="mb-1 flex items-center justify-between">
          <h1 className="mb-1">Conversas</h1>
          <div className="flex items-center gap-2">
            <IconButton id="filter-chats-button" onClick={openFilterMenu}>
              <FilterList />
            </IconButton>
            <IconButton id="add-chat-button">
              <AddIcon />
            </IconButton>
          </div>
          <Menu open={isFilterMenuOpen} anchorEl={anchorEl} onClose={closeMenu}>
            <MenuItem className="flex items-center gap-2">
              <MarkChatUnreadIcon />
              <p>Não lidas</p>
            </MenuItem>
            <MenuItem className="flex items-center gap-2">
              <ScheduleIcon />
              <p>Agendados</p>
            </MenuItem>
            {/*             <MenuItem className="flex items-center gap-2">
              <BedIcon />
              <p>Inativos</p>
            </MenuItem> */}
            {/*             <MenuItem className="flex items-center gap-2">
              <PendingIcon />
              <p>Sem interação</p>
            </MenuItem> */}
            <MenuItem className="flex items-center gap-2">
              <GroupsIcon />
              <p>Internos</p>
            </MenuItem>
          </Menu>
        </header>

        <TextField label="Pesquisar conversa" className="grow" />
      </div>
      {/* Menu */}
      <menu className="flex flex-col gap-2 overflow-y-auto bg-slate-300/5 p-3">
        <ChatsMenuItem
          isUnread
          name="Renan Dutra"
          avatar="./pfp.jpg"
          message="Oi, tudo bem? Gostaria de renovar os produtos do meu estoque..."
          messageDate={new Date()}
          tags={[
            { name: "Agendamento", color: "rgb(128, 0, 0)" },
            { name: "Já comprou", color: "rgb(0, 128, 0)" },
          ]}
        />
        <ChatsMenuItem
          isOpen
          name="Maria Silva"
          message="Poderia me enviar o catálogo, por favor?"
          messageDate={new Date("2025-04-15")}
          tags={[{ name: "Novo", color: "rgb(0, 0, 128)" }]}
        />
        <ChatsMenuItem
          name="João Pereira"
          message="Oi! Quando será a próxima reunião?"
          messageDate={new Date("2025-04-14")}
          tags={[{ name: "Reunião", color: "rgb(150, 105, 0)" }]}
        />
      </menu>
      <footer className="flex h-16 items-center justify-center rounded-b-md bg-slate-300/5 p-2">
        <Pagination />
      </footer>
    </aside>
  );
}
