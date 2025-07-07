import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useEffect, useMemo, useState } from "react";
import { WppContactWithCustomer } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../../whatsapp-context";
import StartChatModalItem from "./start-chat-modal-item";
import { Button } from "@mui/material";

export default function StartChatModal({ onClose }: { onClose: () => void }) {
  const { wppApi } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<Array<WppContactWithCustomer>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (wppApi.current) {
      wppApi.current.getContactsWithCustomer().then((data) => {
        setContacts(data);
      });
    }
  }, []);

  // Filtra e pagina os contatos
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) =>
      contact?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = filteredContacts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Volta para a primeira página ao pesquisar
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return (
    <div className="w-[22rem] rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-semibold text-lg">Iniciar conversa</h1>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Pesquisar nome ou numero..."
        className="mb-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white"
      />
      <ul className="scrollbar-whatsapp flex h-[25rem] flex-col items-center gap-2">
        {paginatedContacts.map((contact) => (
          <StartChatModalItem
            key={contact.id}
            contact={contact}
            customer={contact.customer}
            chatingWith={contact.chatingWith}
            onSelect={onClose}
          />
        ))}
        {paginatedContacts.length === 0 && (
          <li className="text-center text-gray-500 dark:text-gray-400 w-full">Nenhum contato encontrado.</li>
        )}
      </ul>
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outlined"
          size="small"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Anterior
        </Button>
        <span className="text-sm">
          Página {page} de {totalPages || 1}
        </span>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}