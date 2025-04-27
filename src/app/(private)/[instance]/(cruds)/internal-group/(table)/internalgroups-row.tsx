import EditIcon from '@mui/icons-material/Edit';
import { TableRow } from "@mui/material";
import { InternalGroupClient } from "@in.pulse-crm/sdk";
import { useContext } from "react";
import { InternalGroupsContext } from "../context";
import { StyledTableCell } from "./styles-table";

interface InternalGroupTableRowProps {
  InternalGroup: Partial<InternalGroupClient>;
  index: number;
}

export default function InternalGroupsTableRow({ InternalGroup, index }: InternalGroupTableRowProps) {
  const { openInternalGroupModal } = useContext(InternalGroupsContext);

  return (
    <TableRow sx={{ background: index % 2 === 0 ? 'transparent' : 'rgba(67, 56, 202, 0.05)' }}>
      <StyledTableCell className="px-2 py-3">{InternalGroup.CODIGO}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{InternalGroup.NOME}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{InternalGroup.PARTICIPANTES}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{InternalGroup.DESCRICAO}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{InternalGroup.SETOR}</StyledTableCell>

      <StyledTableCell className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
        <button
          className="transition-all hover:text-red-400"
          title="Editar"
          type="button"
          onClick={() => {
            if (InternalGroup.CODIGO) {
              openInternalGroupModal(InternalGroup as InternalGroupClient);
            }
          }}
        >
          <EditIcon />
        </button>
      </StyledTableCell>
    </TableRow>
  );
}