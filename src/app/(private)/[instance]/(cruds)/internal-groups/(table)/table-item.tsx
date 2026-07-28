import { Delete, Edit, PeopleAlt, WhatsApp } from "@mui/icons-material";
import { InternalGroup, User, WhatsappGroup } from "@/lib/sdk-local";
import { Formatter } from "@in.pulse-crm/utils";
import { IconButton, TableCell, TableRow } from "@mui/material";
import { INTERNAL_GROUPS_TABLE_COLUMNS } from "./table-config";

interface InternalGroupsTableItemProps {
  group: InternalGroup;
  users: User[];
  wppGroups: WhatsappGroup[];
  openEditModalHandler: (group: InternalGroup) => void;
  openDeleteModalHandler: (group: InternalGroup) => void;
}

function getCreator(users: User[], creatorId: number) {
  const creator = users.find((user) => user.CODIGO === creatorId);
  return creator ? creator.NOME : "Desconhecido";
}

export default function InternalGroupsTableItem({
  group,
  users,
  wppGroups,
  openEditModalHandler,
  openDeleteModalHandler,
}: InternalGroupsTableItemProps) {
  const linkedWhatsappGroup = wppGroups.find((wppGroup) => wppGroup.id === group.wppGroupId);

  return (
    <TableRow
      className="transition-colors even:bg-indigo-700/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
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
          width: INTERNAL_GROUPS_TABLE_COLUMNS.ID.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.ID.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{group.id}</span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.width,
        }}
      >
        <p className="truncate text-sm font-medium">{group.groupName || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.width,
        }}
      >
        <p className="text-sm">{group.startedAt ? Formatter.date(group.startedAt) : "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.width,
        }}
      >
        <p className="truncate text-sm">{getCreator(users, group.creatorId || -3)}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.PARTICIPANTS_COUNT.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.PARTICIPANTS_COUNT.width,
        }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
          <PeopleAlt sx={{ fontSize: 15 }} />
          {group.participants?.length || 0} usuários
        </span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.WHATSAPP_GROUP.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.WHATSAPP_GROUP.width,
        }}
      >
        {group.wppGroupId ? (
          <span
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            title={linkedWhatsappGroup?.name || group.wppGroupId}
          >
            <WhatsApp sx={{ fontSize: 15 }} />
            <span className="truncate">{linkedWhatsappGroup?.name || "Grupo vinculado"}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">Não vinculado</span>
        )}
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.ACTIONS.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title="Editar Grupo"
            onClick={() => openEditModalHandler(group)}
            size="small"
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            title="Deletar Grupo"
            onClick={() => openDeleteModalHandler(group)}
            size="small"
            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Delete fontSize="small" />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
