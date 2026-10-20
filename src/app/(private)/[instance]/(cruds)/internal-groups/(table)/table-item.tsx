import { Button as CrmDeleteButton } from "@mui/material";
import { Delete, Edit, PeopleAlt, WhatsApp } from "@/lib/ui-system/crm-icons";
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
      hover
      sx={{
        "& .MuiTableCell-root": {
          borderBottom: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
        },
      }}
    >
      <TableCell
        data-label="Código"
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.ID.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.ID.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{group.id}</span>
      </TableCell>
      <TableCell
        data-label="Nome"
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.width,
        }}
      >
        <p className="truncate text-sm font-medium">{group.groupName || "N/D"}</p>
      </TableCell>
      <TableCell
        data-label="Criação"
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.width,
        }}
      >
        <p className="text-sm">{group.startedAt ? Formatter.date(group.startedAt) : "N/D"}</p>
      </TableCell>
      <TableCell
        data-label="Criador"
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.width,
        }}
      >
        <p className="truncate text-sm">{getCreator(users, group.creatorId || -3)}</p>
      </TableCell>
      <TableCell
        data-label="Usuários do sistema"
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
        data-label="Grupo WhatsApp"
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
          <span className="text-xs text-[var(--ip-muted)]">Não vinculado</span>
        )}
      </TableCell>
      <TableCell
        data-label="Ações"
        className="px-3 py-3"
        sx={{
          width: INTERNAL_GROUPS_TABLE_COLUMNS.ACTIONS.width,
          minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title="Editar Grupo"
            aria-label="Editar Grupo"
            onClick={() => openEditModalHandler(group)}
            size="small"
            color="inherit"
          >
            <Edit fontSize="small" />
          </IconButton>
          <CrmDeleteButton
            aria-label="Excluir grupo"
            size="small"
            color="error"
            onClick={() => openDeleteModalHandler(group)}
          >
            Excluir
          </CrmDeleteButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
