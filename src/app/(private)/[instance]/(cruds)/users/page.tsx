"use client"
import UserFilteringSection from "./(page-sections)/filtering-section";
import UsersProvider, { UsersContext } from "./context";
import UsersTable from "./(table)/table";
import { useContext } from "react";
import ModalWrapper from "@/lib/components/modal-wrapper";
import Button from "@/lib/components/button";

export default function Home() {
    const { openCreateUserModal, modal } = useContext(UsersContext);

    return (
        <div className="flex flex-col p-10 gap-5 w-max-screen h-screen overflow-hidden box-border bg-slate-800">
            <div className="flex justify-between">
                <UserFilteringSection />
                <Button onClick={openCreateUserModal}>
                    Cadastrar
                </Button>
            </div>
            <UsersTable />
            {modal && <ModalWrapper>{modal}</ModalWrapper>}
        </div>
    );
}
