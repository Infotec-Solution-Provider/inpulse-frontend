import { Button, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";

export default function ScheduleChatModal() {
  const { closeModal } = useContext(AppContext);
  const { createSchedule, currentChat } = useContext(WhatsappContext);
  const [date, setDate] = useState<Date | null>(null);

  const handleClickSchedule = () => {
    if (currentChat?.chatType !== "wpp" || !date) return;

    createSchedule(currentChat, date);
    closeModal();
  };

  const handleChangeDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.currentTarget.value);
    setDate(selectedDate);
  };

  return (
    <div className="w-[26rem] rounded-md bg-white text-gray-800 px-4 py-4 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Agendar retorno</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField className="dark:input-dark" type="datetime-local" required onChange={handleChangeDate} />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="contained"
            color="secondary"
            className="w-32"
            onClick={closeModal}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            className="w-32"
            onClick={handleClickSchedule}
          >
            Agendar
          </Button>
        </div>
      </form>
    </div>
  );
}
