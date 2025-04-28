"use client";
import WalletManagementModal from './(modal)/wallet-management-modal';
import WalletsTable from "./(table)/wallets-table";

export default function WalletsManagementPage() {
    return (
        <div className="flex flex-col max-w-[75rem] mx-auto px-10 pt-5 h-screen box-border relative">
            <WalletsTable />
            <WalletManagementModal />
        </div>
    );
}