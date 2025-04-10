"use client";
import Button from "@mui/material/Button";
import { useContext } from "react";
import { UsersContext } from "./context";
import UsersTable from "./(table)/users-table";

export default function Home() {
    const { openCreateUserModal } = useContext(UsersContext);

    return (
        <div className="flex flex-col p-10 gap-5 w-max-screen h-screen overflow-hidden box-border bg-slate-800">
            <div className="flex justify-between">
                <Button onClick={() => openCreateUserModal()}>
                    Cadastrar
                </Button>
            </div>
            <UsersTable />
        </div>
    );
}