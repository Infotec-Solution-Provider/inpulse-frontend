"use client";
import { Avatar, Button, Checkbox, FormControlLabel, Pagination, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChatsMenuItem from "./chats-menu-item";

export default function ChatsMenu() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] flex-col rounded-md bg-slate-900 text-slate-300 drop-shadow-md">
      <div className="flex flex-col gap-1 rounded-t-md p-3">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="mb-1">Conversas</h1>
          <Button variant="text">
            <AddIcon />
          </Button>
        </div>
        <form className="flex flex-col gap-1">
          <TextField variant="outlined" placeholder="Filtrar" size="small" fullWidth />
          <div className="mb-1.5">
            <FormControlLabel
              control={<Checkbox size="small" defaultChecked />}
              label="Agendamentos"
            />
            <FormControlLabel control={<Checkbox size="small" defaultChecked />} label="Outros" />
          </div>
        </form>
      </div>
      <ul className="flex flex-col gap-2 overflow-y-auto bg-slate-300/5">
        <ChatsMenuItem
          name="Renan Dutra"
          avatar="./pfp.jpg"
          message="Oi, tudo bem? Gostaria de renovar os produtos do meu estoque..."
          date="07/04/2015"
          tags={[
            { name: "Agendamento", color: "rgb(128, 0, 0)" },
            { name: "Já comprou", color: "rgb(0, 128, 0)" },
          ]}
        />
        <ChatsMenuItem
          name="Maria Silva"
          avatar="./pfp2.jpg"
          message="Olá! Estou interessada nos novos produtos."
          date="08/04/2015"
          tags={[
            { name: "Novo", color: "rgb(0, 0, 128)" },
          ]}
        />
        <ChatsMenuItem
          name="João Pereira"
          avatar="./pfp3.jpg"
          message="Oi! Quando será a próxima reunião?"
          date="09/04/2015"
          tags={[
            { name: "Reunião", color: "rgb(255, 165, 0)" },
          ]}
        />
      </ul>
      <div className="flex h-16 items-center justify-center rounded-b-md bg-slate-300/5 p-2">
        <Pagination />
      </div>
    </div>
  );
}
