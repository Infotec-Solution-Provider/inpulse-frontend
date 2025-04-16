"use client";
import UsersTable from "./(table)/users-table";

export default function UsersManagementPage() {
    return (
        <div className="flex flex-col px-10 pt-5 w-screen h-screen box-border relative">
            <UsersTable />
        </div>
    );
}