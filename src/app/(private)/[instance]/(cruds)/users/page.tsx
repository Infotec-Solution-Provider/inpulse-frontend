"use client";
import Button from "@mui/material/Button";
import { useContext } from "react";
import { UsersContext } from "./context";
import UsersTable from "./(table)/users-table";

export default function UsersManagementPage() {
    const { openUserModal } = useContext(UsersContext);

    return (
        <div className="flex flex-col px-10 pt-5 gap-5 w-screen h-screen box-border relative">
            <div className="flex w-full flex-row-reverse p-3 bg-indigo-700/5">
                <Button onClick={() => openUserModal()} variant="outlined">
                    Cadastrar
                </Button>
            </div>
            <UsersTable />
        </div>
    );
}