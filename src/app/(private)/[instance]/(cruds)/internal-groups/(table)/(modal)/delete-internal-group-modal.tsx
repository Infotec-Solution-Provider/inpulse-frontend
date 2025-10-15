import { Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { InternalGroup } from "@in.pulse-crm/sdk";
import { useAppContext } from "../../../../app-context";
import { useInternalGroupsContext } from "../../internal-groups-context";

interface DeleteInternalGroupModalProps {
  group: InternalGroup;
}

export default function DeleteInternalGroupModal({ group }: DeleteInternalGroupModalProps) {
  const { closeModal } = useAppContext();
  const { deleteInternalGroup } = useInternalGroupsContext();

  const handleDelete = async () => {
    await deleteInternalGroup(group.id);
    closeModal();
  };

  return (
    <aside className="flex h-full w-full max-w-md flex-col gap-6 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
      <header className="flex w-full items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          Deletar Grupo
        </h1>
        <IconButton 
          onClick={closeModal}
          className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex flex-col gap-4">
        <p className="text-slate-700 dark:text-slate-300">
          Tem certeza que deseja deletar o grupo <strong>&quot;{group.groupName}&quot;</strong>?
        </p>
        <p className="text-sm text-red-600 dark:text-red-400">
          Esta ação não pode ser desfeita.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <Button 
          variant="outlined" 
          onClick={closeModal}
          className="px-6 py-2"
        >
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          color="error"
          onClick={handleDelete}
          className="px-6 py-2"
        >
          Deletar
        </Button>
      </div>
    </aside>
  );
}
