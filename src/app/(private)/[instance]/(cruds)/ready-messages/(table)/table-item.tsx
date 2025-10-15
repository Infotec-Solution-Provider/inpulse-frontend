import { ReadyMessage } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Delete, Edit } from "@mui/icons-material";
import { IconButton, TableCell, TableRow } from "@mui/material";
import { READY_MESSAGES_TABLE_COLUMNS } from "./table-config";

interface ReadyMessagesTableItemProps {
  readyMessage: ReadyMessage;
  sectorName: string | undefined;
  openEditModalHandler: (readyMessage: ReadyMessage) => void;
  openDeleteModalHandler: (readyMessage: ReadyMessage) => void;
}

export default function ReadyMessagesTableItem({
  readyMessage,
  sectorName,
  openEditModalHandler,
  openDeleteModalHandler,
}: ReadyMessagesTableItemProps) {
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
          width: READY_MESSAGES_TABLE_COLUMNS.CODIGO.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.CODIGO.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{readyMessage.id}</span>
      </TableCell>
      <TableCell
        className="truncate px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.TITULO.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.TITULO.width,
        }}
        title={readyMessage.title || "N/D"}
      >
        <p className="truncate text-sm font-medium">{readyMessage.title || "N/D"}</p>
      </TableCell>
      <TableCell
        className="truncate px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.ARQUIVO.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.ARQUIVO.width,
        }}
        title={readyMessage.fileName || "Nenhum arquivo"}
      >
        <p className="truncate text-sm">{readyMessage.fileName || "-"}</p>
      </TableCell>
      <TableCell
        className="truncate px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.TEXTO_MENSAGEM.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.TEXTO_MENSAGEM.width,
        }}
        title={readyMessage.message || "N/D"}
      >
        <p className="truncate text-sm">{readyMessage.message || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.SETOR.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.SETOR.width,
        }}
      >
        <p className="truncate text-sm">{sectorName || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.width,
        }}
      >
        <p className="text-sm">{Formatter.date(readyMessage.updatedAt)}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.ACTIONS.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title="Editar Mensagem Pronta"
            onClick={() => openEditModalHandler(readyMessage)}
            size="small"
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            title="Excluir Mensagem Pronta"
            onClick={() => openDeleteModalHandler(readyMessage)}
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
