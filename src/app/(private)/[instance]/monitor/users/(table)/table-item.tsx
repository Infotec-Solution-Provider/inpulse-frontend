import { User } from "@in.pulse-crm/sdk";
import { StyledTableRow } from "./mui-style";
import { StyledTableCell } from "../../../(cruds)/customers/(table)/mui-style";

interface UserListItemProps {
  User: Partial<User>;
}

export default function UserTableItem({ User }: UserListItemProps) {
  return (
    <StyledTableRow>
      <StyledTableCell className="px-2 py-3">
        <p className="w-14">{User.CODIGO || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">{User.ATIVO || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-64 truncate">{User.NOME || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-40 truncate">{User.EMAIL || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-36 truncate">{User.SETOR || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-0 truncate"></p>
      </StyledTableCell>
    </StyledTableRow>
  );
}
