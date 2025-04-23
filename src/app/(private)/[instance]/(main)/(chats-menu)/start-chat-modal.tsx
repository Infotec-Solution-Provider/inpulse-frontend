import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../app-context";

export default function StartChatModal() {
  const { closeModal } = useContext(AppContext);

  return (
    <div className="w-[26rem] rounded-md bg-slate-700 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Iniciar conversa</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <ul className="h-32 flex items-center justify-center">
        <li className="mx-auto text-slate-200 -translate-y-8">
            <h2> Sem contatos cadastrados...</h2>
        </li>
      </ul>
    </div>
  );
}
