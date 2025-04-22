import EditIcon from '@mui/icons-material/Edit';
import { TableRow } from "@mui/material";
import { WppWallet } from "@in.pulse-crm/sdk";
import { useContext } from "react";
import { WalletsContext } from "../context";
import { StyledTableCell } from "./styles-table";

interface WalletTableRowProps {
  wallet: Partial<WppWallet>;
  index: number;
}

export default function WalletTableRow({ wallet, index }: WalletTableRowProps) {
  const { openWalletModal } = useContext(WalletsContext);

  return (
    <TableRow sx={{ background: index % 2 === 0 ? 'transparent' : 'rgba(67, 56, 202, 0.05)' }}>
      <StyledTableCell className="px-2 py-3">{wallet.id}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{wallet.name}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{wallet.instanceName}</StyledTableCell>

      <StyledTableCell className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
        <button
          className="transition-all hover:text-red-400"
          title="Editar"
          type="button"
          onClick={() => {
            if (wallet.id) {
              openWalletModal(wallet as WppWallet);
            }
          }}
        >
          <EditIcon />
        </button>
      </StyledTableCell>
    </TableRow>
  );
}