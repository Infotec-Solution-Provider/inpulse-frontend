import EditIcon from "@mui/icons-material/Edit";
import { TableRow } from "@mui/material";
import { User } from "@in.pulse-crm/sdk";
import { useContext } from "react";
import { UsersContext } from "../users-context";
import { StyledTableCell } from "./styles-table";

interface UserTableRowProps {
  user: Partial<User>;
  index: number;
  sectors: Array<{ id: number; name: string }>;
}

export default function UsersTableRow({ user, index, sectors }: UserTableRowProps) {
  const { openUserModal } = useContext(UsersContext);
  const sector = sectors.find((s) => s.id === user.SETOR);

  return (
    <TableRow sx={{ background: index % 2 === 0 ? "transparent" : "rgba(67, 56, 202, 0.05)" }}>
      <StyledTableCell className="px-2 py-3">{user.CODIGO || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.NOME || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.LOGIN || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.EMAIL || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{user.NIVEL || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{sector?.name || "N/D"}</StyledTableCell>

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
