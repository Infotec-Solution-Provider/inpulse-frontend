"use client";
import WalletManagementModal from './(modal)/wallet-management-modal';
import WalletsTable from "./(table)/wallets-table";

export default function WalletsManagementPage() {
    return (
        <div className="flex flex-col w-full max-w-[75rem] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-3 sm:pt-4 md:pt-5 min-h-screen max-h-screen box-border relative">
            <div className="w-full overflow-x-auto">
                <WalletsTable />
            </div>
            <WalletManagementModal />
        </div>
    );
}