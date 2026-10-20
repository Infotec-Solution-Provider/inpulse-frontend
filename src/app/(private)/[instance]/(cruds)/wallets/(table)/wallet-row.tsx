import { Settings as SettingsIcon } from "@/lib/ui-system/crm-icons";
import { Delete as DeleteIcon } from "@/lib/ui-system/crm-icons";
import { IconButton, Button, Tooltip, TableRow } from "@mui/material";
import { WppWallet } from "@/lib/sdk-local";
import { useContext } from "react";
import { WalletsContext } from "../context";
import { StyledTableCell } from "./styles-table";

interface WalletTableRowProps {
  wallet: Partial<WppWallet>;
  index: number;
}

export default function WalletTableRow({ wallet, index }: WalletTableRowProps) {
  const { setSelectedWallet, deleteWallet } = useContext(WalletsContext);

  return (
    <TableRow hover>
      <StyledTableCell data-label="Código" className="px-2 py-3">
        <div className="flex justify-center">{wallet.id}</div>
      </StyledTableCell>
      <StyledTableCell data-label="Nome" className="px-2 py-3">
        <div className="flex justify-center">{wallet.name}</div>
      </StyledTableCell>
      <StyledTableCell data-label="Integrantes" className="px-2 py-3">
        <div className="flex justify-center">{wallet.userIds?.length}</div>
      </StyledTableCell>
      <StyledTableCell data-label="Ações" className="px-2 py-3">
        <div className="flex justify-center gap-2">
          <Tooltip title="Gerenciar carteira">
            <IconButton
              aria-label="Gerenciar carteira"
              onClick={() => setSelectedWallet(wallet as WppWallet)}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Button
            color="error"
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir esta carteira?"))
                deleteWallet(wallet.id!);
            }}
          >
            Excluir
          </Button>
        </div>
      </StyledTableCell>
    </TableRow>
  );
}
