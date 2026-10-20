"use client";
import WalletManagementModal from "./(modal)/wallet-management-modal";
import WalletsTable from "./(table)/wallets-table";

export default function WalletsManagementPage() {
  return (
    <div className="min-w-0">
      <WalletsTable />
      <WalletManagementModal />
    </div>
  );
}
