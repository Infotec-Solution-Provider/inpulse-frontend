import { IconButton, MenuItem, TextField, CircularProgress, Fade, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import TagIcon from "@mui/icons-material/Tag";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import DescriptionIcon from "@mui/icons-material/Description";
import BusinessIcon from "@mui/icons-material/Business";
import { ChangeEventHandler, useContext, useEffect, useState } from "react";
import { WppContactWithCustomer } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../../whatsapp-context";
import StartChatModalItem from "./start-chat-modal-item";
import { Button } from "@mui/material";

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("codigo-erp");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  // Debug: monitora mudanças no estado de contatos
  useEffect(() => {
    console.log("🔄 ESTADO DE CONTATOS MUDOU:", {
      quantidade: contacts.length,
      contatos: contacts,
    });
  }, [contacts]);

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Busca os contatos com filtros e paginação no backend
  useEffect(() => {
    console.log("🔄 EFFECT DISPARADO - Buscando contatos...");
    console.log("🔍 wppApi.current existe?", !!wppApi.current);
    
    if (wppApi.current) {
      setLoading(true);

      // Mapeamento dos campos de busca para os parâmetros da API
      const params: any = {
        page,
        perPage: pageSize,
      };

      const sanitizedTerm = getSearchValue(debouncedSearchTerm, searchField);
      
      console.log("📝 TERMO ORIGINAL:", debouncedSearchTerm);
      console.log("📝 TERMO SANITIZADO:", sanitizedTerm);
      console.log("📝 CAMPO DE BUSCA:", searchField);
      console.log("⚠️ TERMO ESTÁ VAZIO?", !sanitizedTerm);

      if (sanitizedTerm) {
        console.log("✅ Adicionando filtro de busca aos params");
        switch (searchField) {
          case "nome":
            params.name = sanitizedTerm;
            break;
          case "telefone":
            params.phone = sanitizedTerm;
            break;
          case "codigo":
            params.customerId = parseInt(sanitizedTerm) || undefined;
            break;
          case "codigo-erp":
            params.customerErp = sanitizedTerm;
            break;
          case "cpf-cnpj":
            params.customerCnpj = sanitizedTerm;
            break;
          case "razao-social":
            params.customerName = sanitizedTerm;
            break;
        }
      } else {
        console.log("⚠️ BUSCA VAZIA - Isso pode ser o problema! A API pode exigir um termo de busca.");
      }

      wppApi.current
        .getContactsWithCustomer(params)
        .then((response: any) => {
          console.log("📞 RESPOSTA DA API:", response);
          console.log("📊 É um array direto?", Array.isArray(response));
          console.log("📈 COMPRIMENTO:", Array.isArray(response) ? response.length : "não é array");
          console.log("🔍 PARAMS ENVIADOS:", params);
          
          // A API retorna diretamente o array de contatos, não um objeto com .data
          const contactsData = Array.isArray(response) ? response : (response.data || []);
          
          setContacts(contactsData);
          // Como a API retorna array direto, usamos o length do array para calcular páginas
          const totalRecords = contactsData.length;
          setTotalPages(Math.ceil(totalRecords / pageSize) || 1);
          
          console.log("✅ CONTATOS SETADOS:", contactsData.length);
          console.log("📄 TOTAL DE PÁGINAS:", Math.ceil(totalRecords / pageSize) || 1);
        })
        .catch((error) => {
          console.error("❌ ERRO AO BUSCAR CONTATOS:", error);
          console.error("❌ DETALHES DO ERRO:", error.response?.data || error.message);
          setContacts([]);
          setTotalPages(1);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [page, debouncedSearchTerm, searchField]);

  // Volta para a primeira página ao pesquisar
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearchTerm, searchField]);

  const handleChangeTerm: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleChangeField: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    setSearchField(e.target.value);
  };

  return (
    <div className="w-[48rem] rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-2xl dark:from-slate-900 dark:to-slate-800">
      {/* Header com gradiente */}
      <header className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
            <ChatBubbleOutlineIcon className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Iniciar Conversa</h1>
            <p className="text-sm text-white/80">Busque e conecte-se com seus contatos</p>
          </div>
        </div>
        <IconButton
          onClick={onClose}
          className="transition-transform duration-300 hover:rotate-90"
          sx={{
            color: "white",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </header>

      {/* Conteúdo principal */}
      <div className="p-6">
        {/* Área de busca melhorada */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <TextField
                size="small"
                fullWidth
                label="Buscar contato"
                placeholder="Digite para pesquisar..."
                value={searchTerm}
                onChange={handleChangeTerm}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    paddingLeft: "40px",
                    borderRadius: "12px",
                    backgroundColor: "white",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 16px rgba(99, 102, 241, 0.2)",
                    },
                  },
                  ".dark &": {
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "rgb(30, 41, 59)",
                      color: "rgb(226, 232, 240)",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                      },
                      "&.Mui-focused": {
                        boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "rgb(148, 163, 184)",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgb(51, 65, 85)",
                    },
                  },
                }}
                InputProps={{
                  endAdornment: loading && <CircularProgress size={20} sx={{ color: "indigo" }} />,
                }}
              />
            </div>
            <TextField
              select
              size="small"
              label="Filtrar por"
              value={searchField}
              onChange={handleChangeField}
              sx={{
                minWidth: "200px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  backgroundColor: "white",
                },
                ".dark &": {
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgb(30, 41, 59)",
                    color: "rgb(226, 232, 240)",
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgb(148, 163, 184)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgb(51, 65, 85)",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "rgb(148, 163, 184)",
                  },
                },
              }}
            >
              <MenuItem value="nome">
                <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                Nome
              </MenuItem>
              <MenuItem value="telefone">
                <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                Telefone
              </MenuItem>
              <MenuItem value="codigo">
                <TagIcon fontSize="small" sx={{ mr: 1 }} />
                Código InPulse
              </MenuItem>
              <MenuItem value="codigo-erp">
                <BusinessCenterIcon fontSize="small" sx={{ mr: 1 }} />
                Código ERP
              </MenuItem>
              <MenuItem value="cpf-cnpj">
                <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
                CPF/CNPJ
              </MenuItem>
              <MenuItem value="razao-social">
                <BusinessIcon fontSize="small" sx={{ mr: 1 }} />
                Razão Social
              </MenuItem>
            </TextField>
          </div>

          {/* Chip de informação */}
          {debouncedSearchTerm && (
            <Fade in={true}>
              <div className="flex items-center gap-2">
                <Chip
                  label={`Buscando: "${debouncedSearchTerm}"`}
                  size="small"
                  onDelete={() => setSearchTerm("")}
                  color="primary"
                  sx={{ borderRadius: "8px" }}
                />
                <span className="text-sm text-gray-500">
                  {contacts.length} resultado{contacts.length !== 1 ? "s" : ""} encontrado
                  {contacts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </Fade>
          )}
        </div>

        {/* Lista de contatos com scroll suave */}
        <div className="mb-6 rounded-xl bg-white p-2 shadow-inner dark:bg-slate-800/50">
          <ul className="scrollbar-whatsapp flex h-[28rem] flex-col gap-2 overflow-y-auto px-2">
            {loading ? (
              <li className="flex h-full flex-col items-center justify-center gap-4 text-gray-500 dark:text-gray-400">
                <CircularProgress size={48} sx={{ color: "indigo" }} />
                <div className="text-center">
                  <p className="text-lg font-medium">Carregando contatos...</p>
                  <p className="text-sm">Aguarde um momento</p>
                </div>
              </li>
            ) : (
              <Fade in={!loading}>
                <div className="space-y-2">
                  {(() => {
                    console.log("🎨 RENDERIZANDO LISTA - Contatos:", contacts.length);
                    return contacts.map((contact, index) => {
                      console.log(`📋 Renderizando contato ${index + 1}:`, contact.name, contact.id);
                      return (
                        <Fade in={true} key={contact.id} style={{ transitionDelay: `${index * 50}ms` }}>
                          <div>
                            <StartChatModalItem
                              contact={
                                {
                                  ...contact,
                                  customerId: contact.customerId ?? undefined,
                                  avatarUrl: contact.avatarUrl ?? undefined,
                                } as any
                              }
                              customer={contact.customer}
                              chatingWith={contact.chatingWith}
                              onSelect={onClose}
                            />
                          </div>
                        </Fade>
                      );
                    });
                  })()}
                  {contacts.length === 0 && (
                    <li className="flex h-[26rem] flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                      <SearchIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                      <div className="text-center">
                        <p className="text-lg font-medium">Nenhum contato encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros ou termos de busca</p>
                      </div>
                    </li>
                  )}
                </div>
              </Fade>
            )}
          </ul>
        </div>

        {/* Paginação moderna */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:from-indigo-950/30 dark:to-purple-950/30">
          <Button
            variant="contained"
            size="medium"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
              },
              "&.Mui-disabled": {
                background: "rgba(0, 0, 0, 0.12)",
              },
            }}
          >
            ← Anterior
          </Button>

          <div className="flex items-center gap-3">
            <Chip
              label={`Página ${page}`}
              color="primary"
              sx={{
                fontWeight: 700,
                fontSize: "0.875rem",
                borderRadius: "10px",
              }}
            />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              de {totalPages || 1}
            </span>
          </div>

          <Button
            variant="contained"
            size="medium"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0 || loading}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
              },
              "&.Mui-disabled": {
                background: "rgba(0, 0, 0, 0.12)",
              },
            }}
          >
            Próxima →
          </Button>
        </div>
      </div>
    </div>
  );
}
