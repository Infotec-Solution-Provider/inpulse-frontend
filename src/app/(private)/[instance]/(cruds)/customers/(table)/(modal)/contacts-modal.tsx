import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Button, IconButton, TextField } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import ContactItem from "./contact-item";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { Add, Close } from "@mui/icons-material";
import { AppContext } from "@/app/(private)/[instance]/app-context";

interface ContactModalProps {
  customer: Customer;
}

export default function ContactsModal({ customer }: ContactModalProps) {
  const { closeModal } = useContext(AppContext);
  const { wppApi, updateChatContact } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<WppContact[]>([]);
  const [filter, setFilter] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const filteredContacts = useMemo(() => {
    const arr: WppContact[] = [];
    const hasNameFilter = filter.name.trim() !== "";
    const hasPhoneFilter = filter.phone.trim() !== "";

    if (!hasNameFilter && !hasPhoneFilter) {
      return contacts;
    }

    for (const contact of contacts) {
      const conditions = [];

      if (hasNameFilter) {
        conditions.push(contact.name.toLowerCase().includes(filter.name.toLowerCase()));
      }
      if (hasPhoneFilter) {
        conditions.push(contact.phone.includes(filter.phone));
      }

      if (conditions.every((condition) => condition)) {
        arr.push(contact);
      }
    }

    return arr;
  }, [filter, contacts]);

  const isFormValid = form.name.length > 0 && form.phone.length >= 10 && form.phone.length <= 15;

  useEffect(() => {
    if (wppApi.current) {
      wppApi.current.getCustomerContacts(customer.CODIGO).then((data) => {
        setContacts(data);
      });
    }
  }, []);

  const handleEdit = useCallback(async (updatedContact: WppContact) => {
    if (wppApi.current) {
      try {
        await wppApi.current.updateContact(updatedContact.id, updatedContact.name);
        toast.success("Contato atualizado com sucesso!");
        setContacts((prevContacts) =>
          prevContacts.map((c) => (c.id === updatedContact.id ? updatedContact : c)),
        );
        updateChatContact(updatedContact.id, updatedContact.name);
      } catch (err) {
        toast.error("Falha ao atualizar contato:\n" + sanitizeErrorMessage(err));
      }
    }
  }, []);

  const handleDelete = useCallback(async (contactId: number) => {
    if (wppApi.current) {
      try {
        await wppApi.current.deleteContact(contactId);
        toast.success("Contato deletado com sucesso!");
        // Remove the contact from the state
        setContacts((prevContacts) => prevContacts.filter((c) => c.id !== contactId));
      } catch (err) {
        toast.error("Falha ao deletar contato:\n" + sanitizeErrorMessage(err));
      }
    }
  }, []);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, name: e.target.value });
  };

  const handleChangePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone: e.target.value.replace(/\D/g, "") });
  };

  const handleClickRegister = () => {
    if (wppApi.current) {
      wppApi.current
        .createContact(form.name, form.phone, customer.CODIGO)
        .then((newContact) => {
          setContacts((prevContacts) => [...prevContacts, newContact]);
          setForm({ name: "", phone: "" });
          toast.success("Contato cadastrado com sucesso!");
        })
        .catch((error) => {
          toast.error("Falha ao cadastrar contato:\n" + sanitizeErrorMessage(error));
        });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Cabeçalho com sombra sutil */}
        <header className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                Contatos
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {customer.RAZAO}
              </p>
            </div>
            <button
              onClick={closeModal}
              className="ml-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              aria-label="Fechar"
            >
              <Close className="w-5 h-5" />
            </button>
          </div>
          
          {/* Barra de busca */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="text"
                value={filter.name}
                onChange={(e) => setFilter(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Buscar por nome"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="relative">
              <input
                type="tel"
                value={filter.phone}
                onChange={(e) => setFilter(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                placeholder="Buscar por telefone"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                inputMode="tel"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </header>
        
        {/* Lista de contatos */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredContacts.map((c) => (
                <li key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <ContactItem contact={c} handleEdit={handleEdit} handleDelete={handleDelete} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Nenhum contato encontrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {filter.name || filter.phone ? 'Tente ajustar sua busca' : 'Adicione um novo contato abaixo'}
              </p>
            </div>
          )}
        </div>
        
        {/* Formulário de adicionar contato */}
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center">
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">+</span>
            Adicionar Contato
          </h2>
          
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={form.name}
                onChange={handleChangeName}
                placeholder="Nome completo"
                className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <div className="relative">
              <input
                type="tel"
                value={form.phone}
                onChange={handleChangePhone}
                placeholder="Número do WhatsApp"
                className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                inputMode="tel"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            
            <button
              onClick={handleClickRegister}
              disabled={!isFormValid}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all flex items-center justify-center space-x-2 ${
                isFormValid 
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm' 
                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Adicionar Contato</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
