"use client";
import Button from "@mui/material/Button";
import { useContext } from "react";
import { UsersContext } from "./context";
import UsersTable from "./(table)/users-table";

export default function UsersManagementPage() {
    const { openUserModal } = useContext(UsersContext);

    return (
        <div className="flex flex-col px-10 pt-5 gap-5 w-screen h-screen box-border relative">
            <Button onClick={() => openUserModal()} variant="outlined" className="self-end">
                Cadastrar
            </Button>
            <UsersTable />
        </div>
    );
}