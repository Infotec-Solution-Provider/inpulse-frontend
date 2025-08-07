import { IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ChangeEventHandler, useContext, useEffect, useMemo, useState } from "react";
import { WppContactWithCustomer } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../../whatsapp-context";
import StartChatModalItem from "./start-chat-modal-item";
import { Button } from "@mui/material";

function getContactField(contact: WppContactWithCustomer, key: string) {
  switch (key) {
    case "nome":
      return contact.name.toLocaleLowerCase().replaceAll(" ", "");
    case "telefone":
      return contact.phone;
    case "cpf-cnpj":
      return contact.customer?.CPF_CNPJ || "";
    case "razao-social":
      return contact.customer?.RAZAO?.toLocaleLowerCase().replaceAll(" ", "") || "";
    case "codigo-erp":
      return contact.customer?.COD_ERP || "";
    default:
      return "";
  }
}

function getSearchValue(value: string, key: string) {
  switch (key) {
    case "nome":
      return value.toLocaleLowerCase().replaceAll(" ", "");
    case "telefone":
      return value.replace(/\D/g, "");
    case "cpf-cnpj":
      return value.replace(/\D/g, "");
    case "razao-social":
      return value.toLocaleLowerCase().replaceAll(" ", "");
    case "codigo-erp":
      return value;
    default:
      return "";
  }
}

export default function StartChatModal({ onClose }: { onClose: () => void }) {
  const { wppApi } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<Array<WppContactWithCustomer>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("codigo-erp");
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
    const sanitizedTerm = getSearchValue(searchTerm, searchField);

    return contacts.filter((c) => {
      const loweredValue = getContactField(c, searchField)?.toLocaleLowerCase();

      return loweredValue.includes(sanitizedTerm);
    });
  }, [contacts, searchTerm, searchField]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = filteredContacts.slice((page - 1) * pageSize, page * pageSize);

  // Volta para a primeira página ao pesquisar
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleChangeTerm: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleChangeField: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    setSearchField(e.target.value);
  };

  return (
    <div className="w-[40rem] rounded-md bg-slate-100 px-4 py-4 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-semibold text-lg">Iniciar conversa</h1>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      <div className="mb-2 flex items-center gap-2">
        <div className="w-[calc(50%-0.25rem)]">
          <TextField
            size="small"
            fullWidth
            label="Valor da pesquisa"
            value={searchTerm}
            onChange={handleChangeTerm}
          />
        </div>
        <div className="w-[calc(50%-0.25rem)]">
          <TextField
            select
            size="small"
            fullWidth
            label="Campo de busca"
            value={searchField}
            onChange={handleChangeField}
          >
            <MenuItem value="nome">Contato - Nome</MenuItem>
            <MenuItem value="telefone">Contato - Telefone</MenuItem>
            <MenuItem value="codigo">Cliente - Código InPulse</MenuItem>
            <MenuItem value="codigo-erp">Cliente - Código ERP</MenuItem>
            <MenuItem value="cpf-cnpj">Cliente - CPF/CNPJ</MenuItem>
            <MenuItem value="razao-social">Cliente - Razão Social</MenuItem>
          </TextField>
        </div>
      </div>
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
          <li className="w-full text-center text-gray-500 dark:text-gray-400">
            Nenhum contato encontrado.
          </li>
        )}
      </ul>
      <div className="mt-4 flex items-center justify-between">
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
