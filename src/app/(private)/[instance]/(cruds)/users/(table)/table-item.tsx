import { Edit } from "@mui/icons-material";
import { User } from "@in.pulse-crm/sdk";
import { IconButton, TableCell, TableRow } from "@mui/material";
import { useUsersContext } from "../users-context";
import { USERS_TABLE_COLUMNS } from "./table-config";

interface UsersTableItemProps {
  user: User;
  openEditModalHandler: (user: User) => void;
}

export default function UsersTableItem({ user, openEditModalHandler }: UsersTableItemProps) {
  const { sectors } = useUsersContext();
  const sector = sectors.find((s) => s.id === user.SETOR);

  const getNivelLabel = (nivel: string | null) => {
    switch (nivel) {
      case "ADMIN":
        return "Administrador";
      case "ATIVO":
        return "Ativo";
      case "RECEP":
        return "Recepção";
      case "AMBOS":
        return "Ambos";
      default:
        return "N/D";
    }
  };

  return (
    <TableRow
      className="even:bg-indigo-700/5 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
      sx={{
        "& .MuiTableCell-root": {
          borderBottom: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
        },
      }}
    >
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.CODIGO.width,
          minWidth: USERS_TABLE_COLUMNS.CODIGO.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{user.CODIGO}</span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.NOME.width,
          minWidth: USERS_TABLE_COLUMNS.NOME.width,
        }}
      >
        <p className="truncate text-sm font-medium">{user.NOME || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.LOGIN.width,
          minWidth: USERS_TABLE_COLUMNS.LOGIN.width,
        }}
      >
        <p className="font-mono text-sm">{user.LOGIN || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.EMAIL.width,
          minWidth: USERS_TABLE_COLUMNS.EMAIL.width,
        }}
      >
        <p className="truncate text-sm">{user.EMAIL || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.NIVEL.width,
          minWidth: USERS_TABLE_COLUMNS.NIVEL.width,
        }}
      >
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            user.NIVEL === "ADMIN"
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              : user.NIVEL === "ATIVO" || user.NIVEL === "RECEP" || user.NIVEL === "AMBOS"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {getNivelLabel(user.NIVEL)}
        </span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.SETOR.width,
          minWidth: USERS_TABLE_COLUMNS.SETOR.width,
        }}
      >
        <p className="truncate text-sm">{sector?.name || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: USERS_TABLE_COLUMNS.ACTIONS.width,
          minWidth: USERS_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title="Editar Usuário"
            onClick={() => openEditModalHandler(user)}
            size="small"
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Edit fontSize="small" />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
