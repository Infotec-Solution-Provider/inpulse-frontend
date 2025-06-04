import { Button } from "@mui/material";
import { useAppContext } from "../../../app-context";


interface DeleteInternalGroupModalProps {
  readyMessageId: number;
  readyMessageName: string;
  deleteGroup: (id: number) => Promise<void>;
}

export default function DeleteInternalGroupModal({
  readyMessageId,
  readyMessageName,
  deleteGroup,
}: DeleteInternalGroupModalProps) {
  const { closeModal } = useAppContext();

  const handleSubmit = async () => {
    deleteGroup(readyMessageId);
    closeModal();
  };

  return (
    <div>
      <div className="flex flex-col gap-6 bg-white text-gray-800 dark:bg-slate-800 dark:text-white px-[2rem] py-[1rem]">
        <header className="text-lg text-semibold">Deletar Mensagem pronta</header>
        <div className="flex flex-col gap-4">
          <h1>Tem certeza que deseja excluir a Menssagem pronta "{readyMessageName}"?</h1>
        </div>

        <div className="flex w-full flex-row justify-end gap-4 pt-4">
          <Button color="error" onClick={closeModal}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            Deletar
          </Button>
        </div>
      </div>
    </div>
  );
}
