import { Button } from "@mui/material";
import { useAppContext } from "../../../app-context";


interface DeleteInternalGroupModalProps {
  groupId: number;
  groupName: string;
  deleteGroup: (id: number) => Promise<void>;
}

export default function DeleteInternalGroupModal({
  groupId,
  groupName,
  deleteGroup,
}: DeleteInternalGroupModalProps) {
  const { closeModal } = useAppContext();

  const handleSubmit = async () => {
    deleteGroup(groupId);
    closeModal();
  };

  return (
    <div>
      <div className="flex flex-col gap-6 bg-slate-800 px-[2rem] py-[1rem]">
        <header>Deletar Grupo</header>
        <div className="flex flex-col gap-4">
          <h1>Tem certeza que deseja excluiro grupo "{groupName}"?</h1>
          <h3>Todas as mensagens serão perdidas se fizer isto!</h3>
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
