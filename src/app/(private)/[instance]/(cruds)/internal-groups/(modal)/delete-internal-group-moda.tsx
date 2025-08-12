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
<div className="flex flex-col gap-4 sm:gap-6 p-4 sm:px-6 sm:py-6 rounded-2xl bg-white text-black dark:dark:bg-slate-800 dark:text-white shadow-xl w-full max-w-md mx-4">
  <header className="text-2xl font-semibold border-b border-slate-300 dark:border-slate-600 pb-2">
    Deletar Grupo
  </header>

  <div className="flex flex-col gap-3">
    <h1 className="text-lg font-medium">
      Tem certeza que deseja excluir o grupo <span className="font-bold text-red-600 dark:text-red-400">"{groupName}"</span>?
    </h1>
    <h3 className="text-sm text-slate-600 dark:text-slate-300">
      Todas as mensagens serão <span className="font-semibold">perdidas</span> se fizer isto!
    </h3>
  </div>

  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 w-full">
    <Button onClick={closeModal} className="w-full sm:w-auto border border-red-500 text-red-500 dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900">
      Cancelar
    </Button>
    <Button onClick={handleSubmit} variant="contained" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600">
      Deletar
    </Button>
  </div>
</div>

    </div>
  );
}
