import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import { TableRow } from "@mui/material";
import { WppWallet } from "@in.pulse-crm/sdk";
import { useContext, useState } from "react";
import { WalletsContext } from "../context";
import { StyledTableCell } from "./styles-table";
import CustomAlert from '../utils/custom-alert';

interface WalletTableRowProps {
  wallet: Partial<WppWallet>;
  index: number;
}

export default function WalletTableRow({ wallet, index }: WalletTableRowProps) {

  const { setSelectedWallet, deleteWallet } = useContext(WalletsContext);
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null)

  const handleDeleteConfirmation = (id: number) => {
    setSelectedWalletId(id);
    setShowCustomAlert(true);
  };

  const handleConfirmDelete = () => {
    if (selectedWalletId) {
      deleteWallet(selectedWalletId);
    }
    setShowCustomAlert(false);
  };

  return (
    <>
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
              onClick={() => wallet.id && handleDeleteConfirmation(wallet.id)}
            />
          </div>
        </StyledTableCell>
      </TableRow>
      <CustomAlert
        open={showCustomAlert}
        onClose={() => setShowCustomAlert(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar remoção"
        message="Tem certeza que deseja excluir esta carteira?"
      />
    </>
  );
}