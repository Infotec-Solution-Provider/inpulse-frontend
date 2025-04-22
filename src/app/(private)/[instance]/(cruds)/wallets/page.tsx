"use client";
import WalletsTable from "./(table)/wallets-table";

export default function WalletsManagementPage() {
    return (
        <div className="flex flex-col px-10 pt-5 w-screen h-screen box-border relative">
            <WalletsTable />
        </div>
    );
}