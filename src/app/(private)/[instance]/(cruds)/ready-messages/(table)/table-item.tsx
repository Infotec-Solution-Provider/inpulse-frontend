import { Button as CrmDeleteButton } from "@mui/material";
import { ReadyMessage } from "@/lib/sdk-local";
import { Formatter } from "@in.pulse-crm/utils";
import { Delete, Edit } from "@/lib/ui-system/crm-icons";
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
          width: READY_MESSAGES_TABLE_COLUMNS.CODIGO.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.CODIGO.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{readyMessage.id}</span>
      </TableCell>
      <TableCell
        data-label="Título"
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
        data-label="Arquivo"
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
        data-label="Mensagem"
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
        data-label="Setor"
        className="px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.SETOR.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.SETOR.width,
        }}
      >
        <p className="truncate text-sm">{sectorName || "N/D"}</p>
      </TableCell>
      <TableCell
        data-label="Atualização"
        className="px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.width,
        }}
      >
        <p className="text-sm">{Formatter.date(readyMessage.updatedAt)}</p>
      </TableCell>
      <TableCell
        data-label="Ações"
        className="px-3 py-3"
        sx={{
          width: READY_MESSAGES_TABLE_COLUMNS.ACTIONS.width,
          maxWidth: READY_MESSAGES_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title="Editar Mensagem Pronta"
            aria-label="Editar Mensagem Pronta"
            onClick={() => openEditModalHandler(readyMessage)}
            size="small"
            color="inherit"
          >
            <Edit fontSize="small" />
          </IconButton>
          <CrmDeleteButton
            aria-label="Excluir mensagem pronta"
            size="small"
            color="error"
            onClick={() => openDeleteModalHandler(readyMessage)}
          >
            Excluir
          </CrmDeleteButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
