import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
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

  const { setSelectedWallet, deleteWallet } = useContext(WalletsContext);

  return (
    <TableRow sx={{ background: index % 2 === 0 ? 'transparent' : 'rgba(67, 56, 202, 0.05)' }}>
      <StyledTableCell className="px-2 py-3">
        <div className='flex justify-center'>
          {wallet.id}
        </div>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <div className='flex justify-center'>
          {wallet.name}
        </div>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <div className='flex justify-center'>
          {(wallet.userIds)?.length}
        </div>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <div className="flex gap-2 justify-center">
          <SettingsIcon
            className="cursor-pointer hover:text-blue-500"
            onClick={() => setSelectedWallet(wallet as WppWallet)}
          />
          <DeleteIcon
            className="cursor-pointer hover:text-red-500"
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir esta carteira?')) {
                deleteWallet(wallet.id!);
              }
            }}
          />
        </div>
      </StyledTableCell>
    </TableRow>
  );
}