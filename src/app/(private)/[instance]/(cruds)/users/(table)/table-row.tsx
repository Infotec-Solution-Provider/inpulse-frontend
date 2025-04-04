import { FaPencil } from "react-icons/fa6";
import { StyledTableCell, StyledTableRow } from "./table-style";
import { User } from "@in.pulse-crm/sdk";

interface UsersTableRowProps {
  user: User;
}

export default function UsersTableRow({ user }: UsersTableRowProps) {
  return (
    <StyledTableRow>
      <StyledTableCell className="px-2 py-3">
        {user.CODIGO}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {user.NOME}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {user.NIVEL}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {user.LOGIN}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {user.EMAIl}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {user.SETOR_NOME}
      </StyledTableCell>
      <StyledTableCell className="w-16 px-2 py-3">
        <div className="flex justify-end">
          <button className="hover:text-red-400 transition-all" title="Editar" type="button">
            <FaPencil />
          </button>
        </div>
      </StyledTableCell>
    </StyledTableRow>
  );
}