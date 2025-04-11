import EditIcon from '@mui/icons-material/Edit';
import { TableRow } from "@mui/material";
import { User } from "@in.pulse-crm/sdk";
import { useContext } from "react";
import { UsersContext } from "../context";
import { StyledTableCell } from "./styles-table";

interface UserTableRowProps {
  user: Partial<User>;
  index: number;
}

export default function UsersTableRow({ user, index }: UserTableRowProps) {
  const { openUserModal } = useContext(UsersContext);

  return (
    <TableRow>
      <StyledTableCell className="px-2 py-3">{user.CODIGO}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.NOME}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.LOGIN}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.EMAIL}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.NIVEL}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.SETOR}</StyledTableCell>

      <StyledTableCell className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
        <button
          className="transition-all hover:text-red-400"
          title="Editar"
          type="button"
          onClick={() => {
            if (user.CODIGO) {
              openUserModal(user as User);
            }
          }}
        >
          <EditIcon />
        </button>
      </StyledTableCell>
    </TableRow>
  );
}