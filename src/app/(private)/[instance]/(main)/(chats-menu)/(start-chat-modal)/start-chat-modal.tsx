import CustomerBusinessFiltersPanel from "@/lib/components/customer-business-filters";
import useCustomerBusinessFilterOptions from "@/lib/hooks/use-customer-business-filter-options";
import { WppContactWithCustomer } from "@/lib/sdk-local";
import {
  countCustomerBusinessFilters,
  createEmptyCustomerBusinessFilters,
  type CustomerBusinessFilters,
} from "@/lib/types/customer-business-filters";
import BusinessIcon from "@mui/icons-material/Business";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import SearchIcon from "@mui/icons-material/Search";
import TagIcon from "@mui/icons-material/Tag";
import {
  Button,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  MenuItem,
  Popover,
  Skeleton,
  TextField,
} from "@mui/material";
import { ChangeEventHandler, useContext, useEffect, useState } from "react";
import { WhatsappContext } from "../../../whatsapp-context";
import StartChatModalItem from "./start-chat-modal-item";

function getSearchValue(value: string, key: string) {
  switch (key) {
    case "nome":
      return value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
    case "telefone":
    case "cpf-cnpj":
      return value.replace(/\D/g, "");
    case "razao-social":
      return value.toLocaleLowerCase();
    case "codigo":
    case "codigo-erp":
      return value.trim();
    default:
      return "";
  }
}

function toContactFilters(filters: CustomerBusinessFilters) {
  return {
    ...(filters.purchaseStatus ? { purchaseStatus: filters.purchaseStatus } : {}),
    ...(filters.purchaseStatus !== "without_purchases" && filters.purchaseFrom
      ? { purchaseFrom: filters.purchaseFrom }
      : {}),
    ...(filters.purchaseStatus !== "without_purchases" && filters.purchaseTo
      ? { purchaseTo: filters.purchaseTo }
      : {}),
    ...(filters.campaignIds.length ? { campaignIds: filters.campaignIds } : {}),
    ...(filters.segmentIds.length ? { segmentIds: filters.segmentIds } : {}),
    ...(filters.registeredFrom ? { registeredFrom: filters.registeredFrom } : {}),
    ...(filters.registeredTo ? { registeredTo: filters.registeredTo } : {}),
    ...(filters.loyaltyOperatorIds.length
      ? { loyaltyOperatorIds: filters.loyaltyOperatorIds }
      : {}),
  };
}

export default function StartChatModal({ onClose }: { onClose: () => void }) {
  const { wppApi } = useContext(WhatsappContext);
  const { options: businessFilterOptions, loading: loadingBusinessFilterOptions } =
    useCustomerBusinessFilterOptions();
  const [contacts, setContacts] = useState<WppContactWithCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [searchField, setSearchField] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("startChatModalFilterType") || "codigo-erp";
    }
    return "codigo-erp";
  });
  const [businessFilters, setBusinessFilters] = useState(createEmptyCustomerBusinessFilters);
  const [appliedBusinessFilters, setAppliedBusinessFilters] = useState(
    createEmptyCustomerBusinessFilters,
  );
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLButtonElement | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    if (!wppApi.current) return;

    let active = true;
    setLoading(true);
    const params: Parameters<typeof wppApi.current.getContactsWithCustomer>[0] = {
      page,
      perPage: pageSize,
      ...toContactFilters(appliedBusinessFilters),
    };
    const sanitizedTerm = getSearchValue(appliedSearchTerm, searchField);

    if (sanitizedTerm) {
      if (searchField === "nome") params.name = sanitizedTerm;
      if (searchField === "telefone") params.phone = sanitizedTerm;
      if (searchField === "codigo") params.customerId = Number(sanitizedTerm) || undefined;
      if (searchField === "codigo-erp") params.customerErp = sanitizedTerm;
      if (searchField === "cpf-cnpj") params.customerCnpj = sanitizedTerm;
      if (searchField === "razao-social") params.customerName = sanitizedTerm;
    }

    wppApi.current
      .getContactsWithCustomer(params)
      .then((response) => {
        if (!active) return;
        setContacts(Array.isArray(response.data) ? response.data : []);
        setTotalPages(Math.max(1, Number(response.pagination?.totalPages) || 1));
        setTotalResults(Number(response.pagination?.total) || 0);
      })
      .catch((error) => {
        console.error("Erro ao buscar contatos:", error);
        if (!active) return;
        setContacts([]);
        setTotalPages(1);
        setTotalResults(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedBusinessFilters, appliedSearchTerm, page, searchField, wppApi]);

  const handleChangeTerm: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleChangeField: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    const value = event.target.value;
    setSearchField(value);
    setSearchTerm("");
    setAppliedSearchTerm("");
    setPage(1);
    if (typeof window !== "undefined") localStorage.setItem("startChatModalFilterType", value);
  };

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedBusinessFilters({ ...businessFilters });
    setPage(1);
  };

  const handleClearBusinessFilters = () => {
    const empty = createEmptyCustomerBusinessFilters();
    setBusinessFilters(empty);
    setAppliedBusinessFilters(createEmptyCustomerBusinessFilters());
    setPage(1);
  };

  const activeBusinessFiltersCount = countCustomerBusinessFilters(businessFilters);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shadow-2xl dark:from-slate-900 dark:to-slate-800 sm:mx-auto sm:my-4 sm:h-[85vh] sm:max-h-[90vh] sm:min-h-[38rem] sm:w-[60rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-xl">
      <header className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 text-white shadow-lg sm:rounded-t-xl sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
            <ChatBubbleOutlineIcon className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Iniciar Conversa</h1>
            <p className="text-sm text-white/80">Busque e conecte-se com seus contatos</p>
          </div>
        </div>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-6">
        <div className="mb-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TextField
              size="small"
              fullWidth
              label="Buscar contato"
              placeholder="Digite para pesquisar..."
              value={searchTerm}
              onChange={handleChangeTerm}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              InputProps={{ endAdornment: loading ? <CircularProgress size={20} /> : null }}
            />
            <TextField
              select
              size="small"
              label="Filtrar por"
              value={searchField}
              onChange={handleChangeField}
              sx={{ minWidth: 200 }}
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
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              startIcon={<SearchIcon />}
              sx={{ whiteSpace: "nowrap" }}
            >
              Pesquisar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            <Button
              size="small"
              variant={activeBusinessFiltersCount ? "contained" : "outlined"}
              onClick={(event) => setFiltersAnchor(event.currentTarget)}
              startIcon={<FilterAltIcon />}
            >
              Filtros CRM {activeBusinessFiltersCount ? `(${activeBusinessFiltersCount})` : ""}
            </Button>
            {appliedSearchTerm && <Chip size="small" label={`Busca: ${appliedSearchTerm}`} />}
            <span className="text-xs text-slate-500">{totalResults} resultado(s)</span>
            <Button
              size="small"
              onClick={handleClearBusinessFilters}
              disabled={!activeBusinessFiltersCount}
              sx={{ ml: "auto" }}
            >
              Limpar filtros
            </Button>
          </div>

          <Popover
            open={Boolean(filtersAnchor)}
            anchorEl={filtersAnchor}
            onClose={() => setFiltersAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{
              paper: { sx: { mt: 1, width: 680, maxWidth: "calc(100vw - 24px)", p: 2 } },
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Filtros de CRM</p>
                <p className="text-xs text-slate-500">
                  Todos os critérios são aplicados simultaneamente.
                </p>
              </div>
              {loadingBusinessFilterOptions && <Chip size="small" label="Carregando opções" />}
            </div>
            <CustomerBusinessFiltersPanel
              filters={businessFilters}
              options={businessFilterOptions}
              onChange={setBusinessFilters}
            />
          </Popover>
        </div>

        <div className="mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-2 shadow-inner dark:bg-slate-800/50">
          <ul className="scrollbar-whatsapp flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-16">
            {loading ? (
              <li className="space-y-3 px-1 py-2" aria-label="Carregando contatos">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 rounded-xl p-4">
                    <Skeleton variant="circular" width={56} height={56} />
                    <div className="flex-1">
                      <Skeleton />
                      <Skeleton width="60%" />
                    </div>
                  </div>
                ))}
              </li>
            ) : contacts.length ? (
              contacts.map((contact, index) => (
                <li key={contact.id}>
                  <Fade in style={{ transitionDelay: `${index * 40}ms` }}>
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
                </li>
              ))
            ) : (
              <li className="flex min-h-[12rem] flex-col items-center justify-center gap-3 text-slate-400">
                <SearchIcon sx={{ fontSize: 56, opacity: 0.3 }} />
                <p>Nenhum contato encontrado</p>
              </li>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/30">
          <Button
            variant="contained"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span className="text-sm font-medium">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="contained"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
