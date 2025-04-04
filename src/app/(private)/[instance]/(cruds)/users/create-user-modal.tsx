import { FormEventHandler, useCallback, useContext, useState } from "react"
import { UsersContext } from "./context"
import { FaXmark } from "react-icons/fa6";
import { formTabs } from "./(forms)/tabs";
import { Tabs } from "./(page-sections)/(modal)/modal-tabs";
import FormGeral from "./(forms)/form-geral";
import Button from "@/lib/components/button";
import FormTelefonia from "./(forms)/form-telefonia";

export default function CreateUserModal() {
    const { closeModal, createUser, form } = useContext(UsersContext);
    const [selectedTab, setSelectedTab] = useState('Geral');


    const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback((event) => {
        event.preventDefault();

        console.log(form);

        //createUser(form);
    }, [form]);

    return (
        <div className="flex flex-col gap-1 bg-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.3)] p-8 rounded-lg relative h-[80vh] w-[700px]">
            <header className="flex max-w-full pt-0 px-4 pb-4 items-center justify-between h-[40px]">
                <p className="m-0 text-base">Cadastro de usuários</p>
                <button
                    onClick={closeModal}
                    className="flex items-center justify-center w-6 h-6 p-2 rounded-full hover:bg-gray-500 transition-colors text-white text-base"
                >
                    <FaXmark />
                </button>
            </header>
            <main className="flex-1 flex flex-col min-h-0">
                <Tabs
                    tabs={formTabs}
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                />

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
                    {selectedTab === 'Geral' && <FormGeral />}
                    {selectedTab === 'Telefonia' && <FormTelefonia />}
                    <div className="mt-4 mb-2 pt-2 border-t-2 border-indigo-900 flex justify-end gap-2 h-[40px]">
                        <Button type="button" onClick={closeModal} >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Salvar
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    )
}