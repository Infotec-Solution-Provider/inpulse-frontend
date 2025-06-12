import { IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { WppContact } from "@in.pulse-crm/sdk";
import { StyledTableCell, StyledTableRow } from "../../users/(table)/styles-table";
import { Edit } from "@mui/icons-material";

export default function ContactsTableItem({
  contact,
  openEditModalHandler,
  deleteContactHandler,
}: {
  contact: WppContact;
  openEditModalHandler: (c: WppContact) => void;
  deleteContactHandler: (c: WppContact) => void;
}) {
  return (
    <StyledTableRow>
      <StyledTableCell>{contact.id}</StyledTableCell>
      <StyledTableCell>{contact.name}</StyledTableCell>
      <StyledTableCell>{contact.phone}</StyledTableCell>
      <StyledTableCell>{contact.isBlocked ? "Sim" : "Não"}</StyledTableCell>
      <StyledTableCell>{contact.isOnlyAdmin ? "Sim" : "Não"}</StyledTableCell>

      <StyledTableCell align="right">
        <Tooltip title="Editar">
          <IconButton onClick={() => openEditModalHandler(contact)}>
             <Edit />
          </IconButton>
        </Tooltip>

        <Tooltip title="Excluir">
          <IconButton onClick={() => deleteContactHandler(contact)} color="error">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </StyledTableCell>

    </StyledTableRow>
  );
}
