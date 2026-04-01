import { IconButton, MenuItem, TextField, CircularProgress, Fade, Chip, Skeleton, Popover } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import TagIcon from "@mui/icons-material/Tag";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import DescriptionIcon from "@mui/icons-material/Description";
import BusinessIcon from "@mui/icons-material/Business";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { ChangeEventHandler, useContext, useEffect, useMemo, useState } from "react";
import { WppContactWithCustomer } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../../whatsapp-context";
import StartChatModalItem from "./start-chat-modal-item";
import { Button } from "@mui/material";
import type {
  CustomerAgeLevel,
  CustomerInteractionLevel,
  CustomerPurchaseInterestLevel,
  CustomerProfileSummaryLevel,
  CustomerProfileSummaryPayload,
  CustomerPurchaseLevel,
} from "@/lib/types/customer-profile-summary";

type SummaryFilterValue<T extends string> = T | "all";

type SummaryFiltersState = {
  profileLevel: SummaryFilterValue<CustomerProfileSummaryLevel>;
  interactionLevel: SummaryFilterValue<CustomerInteractionLevel>;
  purchaseLevel: SummaryFilterValue<CustomerPurchaseLevel>;
  ageLevel: SummaryFilterValue<CustomerAgeLevel>;
  purchaseInterestLevel: SummaryFilterValue<CustomerPurchaseInterestLevel>;
};

const DEFAULT_SUMMARY_FILTERS: SummaryFiltersState = {
  profileLevel: "all",
  interactionLevel: "all",
  purchaseLevel: "all",
  ageLevel: "all",
  purchaseInterestLevel: "all",
};

const SUMMARY_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerProfileSummaryLevel>; label: string }> = [
  { value: "all", label: "Todos os perfis" },
  { value: "potencial_de_compra", label: "Potencial de compra" },
  { value: "consolidado", label: "Consolidado" },
  { value: "precisa_mais_interacao", label: "Precisa mais interação" },
  { value: "em_observacao", label: "Em observação" },
];

const INTERACTION_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerInteractionLevel>; label: string }> = [
  { value: "all", label: "Toda interação" },
  { value: "sem_interacao", label: "Sem interação" },
  { value: "pouca_interacao", label: "Pouca interação" },
  { value: "interacao_media", label: "Interação média" },
  { value: "interacao_alta", label: "Interação alta" },
];

const PURCHASE_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerPurchaseLevel>; label: string }> = [
  { value: "all", label: "Toda compra" },
  { value: "sem_compras", label: "Sem compras" },
  { value: "poucas_compras", label: "Poucas compras" },
  { value: "compras_medias", label: "Compras médias" },
  { value: "muitas_compras", label: "Muitas compras" },
];

const AGE_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerAgeLevel>; label: string }> = [
  { value: "all", label: "Toda idade" },
  { value: "sem_data_cadastro", label: "Sem data cadastro" },
  { value: "cliente_novo", label: "Cliente novo" },
  { value: "ate_6_meses", label: "Até 6 meses" },
  { value: "ate_12_meses", label: "Até 12 meses" },
  { value: "mais_de_12_meses", label: "Mais de 12 meses" },
];

const PURCHASE_INTEREST_FILTER_OPTIONS: Array<{
  value: SummaryFilterValue<CustomerPurchaseInterestLevel>;
  label: string;
}> = [
  { value: "all", label: "Todo interesse" },
  { value: "nao_analisado", label: "Não analisado pela IA" },
  { value: "baixo_interesse", label: "Baixo interesse" },
  { value: "interesse_moderado", label: "Interesse moderado" },
  { value: "alto_interesse", label: "Alto interesse" },
  { value: "pronto_para_compra", label: "Pronto para compra" },
];

function getOptionLabel<T extends string>(
  options: Array<{ value: SummaryFilterValue<T>; label: string }>,
  value: SummaryFilterValue<T>
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getSearchValue(value: string, key: string) {
  switch (key) {
    case "nome":
      return value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
    case "telefone":
      return value.replace(/\D/g, "");
    case "cpf-cnpj":
      return value.replace(/\D/g, "");
    case "razao-social":
      return value.toLocaleLowerCase();
    case "codigo-erp":
      return value;
    default:
      return "";
  }
}

export default function StartChatModal({ onClose }: { onClose: () => void }) {
  const { wppApi } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<Array<WppContactWithCustomer>>([]);
  const [profileSummaries, setProfileSummaries] = useState<Record<number, CustomerProfileSummaryPayload | null>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [searchField, setSearchField] = useState(() => {
    // Load saved filter from localStorage, default to "codigo-erp"
    if (typeof window !== "undefined") {
      return localStorage.getItem("startChatModalFilterType") || "codigo-erp";
    }
    return "codigo-erp";
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [summaryFilters, setSummaryFilters] = useState<SummaryFiltersState>(DEFAULT_SUMMARY_FILTERS);
  const [loadingProfileSummaries, setLoadingProfileSummaries] = useState(false);
  const [advancedFiltersAnchor, setAdvancedFiltersAnchor] = useState<HTMLButtonElement | null>(null);

  const pageSize = 10;

  const hasActiveSummaryFilters = useMemo(
    () =>
      [
        summaryFilters.profileLevel,
        summaryFilters.interactionLevel,
        summaryFilters.purchaseLevel,
        summaryFilters.ageLevel,
        summaryFilters.purchaseInterestLevel === "nao_analisado" ? "all" : summaryFilters.purchaseInterestLevel,
      ].some((value) => value !== "all"),
    [summaryFilters]
  );

  const customerIds = useMemo(
    () =>
      Array.from(
        new Set(
          contacts
            .map((contact) => Number(contact.customerId))
            .filter((customerId) => Number.isInteger(customerId) && customerId > 0)
        )
      ),
    [contacts]
  );

  const activeSummaryFilterChips = useMemo(() => {
    const chips: string[] = [];

    if (summaryFilters.profileLevel !== "all") {
      chips.push(getOptionLabel(SUMMARY_FILTER_OPTIONS, summaryFilters.profileLevel));
    }

    if (summaryFilters.interactionLevel !== "all") {
      chips.push(getOptionLabel(INTERACTION_FILTER_OPTIONS, summaryFilters.interactionLevel));
    }

    if (summaryFilters.purchaseLevel !== "all") {
      chips.push(getOptionLabel(PURCHASE_FILTER_OPTIONS, summaryFilters.purchaseLevel));
    }

    if (summaryFilters.ageLevel !== "all") {
      chips.push(getOptionLabel(AGE_FILTER_OPTIONS, summaryFilters.ageLevel));
    }

    if (summaryFilters.purchaseInterestLevel !== "all") {
      chips.push(getOptionLabel(PURCHASE_INTEREST_FILTER_OPTIONS, summaryFilters.purchaseInterestLevel));
    }

    return chips;
  }, [summaryFilters]);

  const isAdvancedFiltersOpen = Boolean(advancedFiltersAnchor);

  // Busca os contatos APENAS quando appliedSearchTerm ou page mudam
  // Não busca automaticamente ao digitar ou mudar filtro
  useEffect(() => {
    // Se nunca pesquisou, não faz nada
    async function fetchContacts() {
      if (!wppApi.current) return;
      setLoading(true);

      const params: any = {
        page,
        perPage: pageSize,
      };

      const sanitizedTerm = getSearchValue(appliedSearchTerm, searchField);

      if (sanitizedTerm) {
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
      }

      wppApi.current
        .getContactsWithCustomer(params)
        .then((response: any) => {
          // A API agora retorna: { data: [], pagination: { total, totalPages, ... } }
          const contactsData = response.data || [];
          const pagination = response.pagination || {};

          setContacts(contactsData);
          // Usa o totalPages da paginação do backend
          setTotalPages(pagination.totalPages || 1);
        })
        .catch((error) => {
          console.error("Erro ao buscar contatos:", error);
          setContacts([]);
          setTotalPages(1);
        })
        .finally(() => {
          setLoading(false);
        });
    }

    fetchContacts();
  }, [page, appliedSearchTerm]);

  useEffect(() => {
    if (!wppApi.current || !customerIds.length) {
      setLoadingProfileSummaries(false);
      return;
    }

    const missingCustomerIds = customerIds.filter((customerId) => !(customerId in profileSummaries));
    if (!missingCustomerIds.length) {
      setLoadingProfileSummaries(false);
      return;
    }

    let isMounted = true;
    setLoadingProfileSummaries(true);

    Promise.allSettled(
      missingCustomerIds.map(async (customerId) => {
        const response = await wppApi.current!.ax.get<{ message: string; data: CustomerProfileSummaryPayload }>(
          `/api/whatsapp/customers/${customerId}/profile-tags/summary`
        );

        return {
          customerId,
          summary: response.data.data,
        };
      })
    )
      .then((results) => {
        if (!isMounted) return;

        setProfileSummaries((current) => {
          const next = { ...current };

          for (const result of results) {
            if (result.status === "fulfilled") {
              next[result.value.customerId] = result.value.summary;
              continue;
            }

            const customerId = missingCustomerIds[results.indexOf(result)];
            if (typeof customerId === "number") {
              next[customerId] = null;
            }
          }

          return next;
        });
      })
      .finally(() => {
        if (isMounted) {
          setLoadingProfileSummaries(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [customerIds, profileSummaries, wppApi]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const summary = contact.customerId ? profileSummaries[contact.customerId] : null;

      if (!hasActiveSummaryFilters) {
        return true;
      }

      if (!summary) {
        return false;
      }

      if (summaryFilters.profileLevel !== "all" && summary.profileLevel !== summaryFilters.profileLevel) {
        return false;
      }

      if (
        summaryFilters.interactionLevel !== "all" &&
        summary.tags.interaction.tagValue !== summaryFilters.interactionLevel
      ) {
        return false;
      }

      if (summaryFilters.purchaseLevel !== "all" && summary.tags.purchase.tagValue !== summaryFilters.purchaseLevel) {
        return false;
      }

      if (summaryFilters.ageLevel !== "all" && summary.tags.age.tagValue !== summaryFilters.ageLevel) {
        return false;
      }

      if (
        summaryFilters.purchaseInterestLevel !== "all" &&
        summaryFilters.purchaseInterestLevel !== "nao_analisado" &&
        summary.purchaseInterest.level !== summaryFilters.purchaseInterestLevel
      ) {
        return false;
      }

      return true;
    });
  }, [contacts, hasActiveSummaryFilters, profileSummaries, summaryFilters]);

  const handleChangeTerm: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleChangeField: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    const newValue = e.target.value;
    setSearchField(newValue);
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("startChatModalFilterType", newValue);
    }
    // Ao mudar o filtro, limpa a pesquisa atual
    setAppliedSearchTerm("");
  };

  const handleChangeSummaryFilter =
    (key: keyof SummaryFiltersState): ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> =>
    (e) => {
      setSummaryFilters((current) => ({
        ...current,
        [key]: e.target.value as SummaryFiltersState[typeof key],
      }));
    };

  const handleOpenAdvancedFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAdvancedFiltersAnchor(event.currentTarget);
  };

  const handleCloseAdvancedFilters = () => {
    setAdvancedFiltersAnchor(null);
  };

  // Função que executa a busca ao clicar no botão ou pressionar Enter
  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm);
    setPage(1);
  };

  return (
    <div className="mx-3 my-4 flex h-[85vh] min-h-[38rem] max-h-[90vh] w-[60rem] flex-col overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-2xl dark:from-slate-900 dark:to-slate-800 sm:mx-auto">
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
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
            <Button
              variant="contained"
              size="medium"
              onClick={handleSearch}
              disabled={loading}
              startIcon={<SearchIcon />}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                whiteSpace: "nowrap",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
                },
                "&.Mui-disabled": {
                  background: "rgba(0, 0, 0, 0.12)",
                },
              }}
            >
              Pesquisar
            </Button>
          </div>

          {/* Chip de informação */}
          {appliedSearchTerm && (
            <Fade in={true}>
              <div className="flex items-center gap-2">
                <Chip
                  label={`Buscando: "${appliedSearchTerm}"`}
                  size="small"
                  onDelete={() => {
                    setSearchTerm("");
                    setAppliedSearchTerm("");
                  }}
                  color="primary"
                  sx={{ borderRadius: "8px" }}
                />
                <span className="text-sm text-gray-500">
                  {filteredContacts.length} de {contacts.length} resultado{contacts.length !== 1 ? "s" : ""} exibido
                  {contacts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </Fade>
          )}

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <TextField
                select
                size="small"
                label="Perfil"
                value={summaryFilters.profileLevel}
                onChange={handleChangeSummaryFilter("profileLevel")}
                sx={{ minWidth: 170 }}
              >
                {SUMMARY_FILTER_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <Button
                size="small"
                variant="outlined"
                onClick={handleOpenAdvancedFilters}
                startIcon={<FilterAltIcon sx={{ fontSize: 16 }} />}
                sx={{
                  minWidth: 0,
                  borderRadius: "999px",
                  px: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Avançado
              </Button>

              {loadingProfileSummaries && (
                <Chip
                  size="small"
                  label="Atualizando"
                  sx={{ height: 22, fontSize: "0.7rem", "& .MuiChip-label": { px: 1 } }}
                />
              )}

              {activeSummaryFilterChips.map((label) => (
                <Chip
                  key={label}
                  size="small"
                  label={label}
                  color="primary"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem", "& .MuiChip-label": { px: 1 } }}
                />
              ))}

              {hasActiveSummaryFilters && (
                <Chip
                  size="small"
                  label={`${filteredContacts.length} aderente(s)`}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600, "& .MuiChip-label": { px: 1 } }}
                />
              )}

              <Button
                size="small"
                onClick={() => setSummaryFilters(DEFAULT_SUMMARY_FILTERS)}
                disabled={!hasActiveSummaryFilters}
                sx={{ ml: "auto", minWidth: 0, textTransform: "none", fontWeight: 600, px: 1.25 }}
              >
                Limpar
              </Button>
            </div>

            <Popover
              open={isAdvancedFiltersOpen}
              anchorEl={advancedFiltersAnchor}
              onClose={handleCloseAdvancedFilters}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  width: 320,
                  borderRadius: 3,
                  p: 2,
                },
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-700">Filtros avançados</div>
                <Button
                  size="small"
                  onClick={() => setSummaryFilters((current) => ({ ...current, interactionLevel: "all", purchaseLevel: "all", ageLevel: "all" }))}
                  sx={{ minWidth: 0, textTransform: "none", px: 1 }}
                >
                  Limpar avançado
                </Button>
              </div>

              <div className="grid gap-2">
                <TextField
                  select
                  size="small"
                  label="Interação"
                  value={summaryFilters.interactionLevel}
                  onChange={handleChangeSummaryFilter("interactionLevel")}
                >
                  {INTERACTION_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Compras"
                  value={summaryFilters.purchaseLevel}
                  onChange={handleChangeSummaryFilter("purchaseLevel")}
                >
                  {PURCHASE_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Tempo de cliente"
                  value={summaryFilters.ageLevel}
                  onChange={handleChangeSummaryFilter("ageLevel")}
                >
                  {AGE_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Interesse de compra (IA)"
                  value={summaryFilters.purchaseInterestLevel}
                  onChange={handleChangeSummaryFilter("purchaseInterestLevel")}
                >
                  {PURCHASE_INTEREST_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Popover>
          </div>
        </div>

        {/* Lista de contatos com scroll suave */}
        <div className="mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-2 shadow-inner dark:bg-slate-800/50">
          <ul className="scrollbar-whatsapp flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-24">
            {loading ? (
              <li className="space-y-3 px-1 py-2" aria-label="Carregando contatos">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`skeleton-contact-${index}`}
                    className="flex items-center gap-4 rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
                  >
                    <Skeleton variant="circular" width={56} height={56} />
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Skeleton variant="text" width="70%" height={24} />
                        <Skeleton variant="text" width="55%" height={20} />
                      </div>
                      <div className="space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                        <Skeleton variant="text" width="75%" height={22} />
                        <Skeleton variant="text" width="60%" height={20} />
                      </div>
                    </div>
                    <Skeleton variant="circular" width={40} height={40} />
                  </div>
                ))}
              </li>
            ) : (
              <>
                {filteredContacts.map((contact, index) => (
                  <li key={contact.id}>
                    <Fade in={!loading} style={{ transitionDelay: `${index * 50}ms` }}>
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
                          profileSummary={contact.customerId ? profileSummaries[contact.customerId] ?? null : null}
                          isProfileLoading={typeof contact.customerId === "number" && !(contact.customerId in profileSummaries)}
                          onSelect={onClose}
                        />
                      </div>
                    </Fade>
                  </li>
                ))}

                {filteredContacts.length === 0 && (
                  <li className="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-8 text-gray-400 dark:text-gray-500">
                    <SearchIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                    <div className="text-center">
                      <p className="text-lg font-medium">Nenhum contato encontrado</p>
                      <p className="text-sm">
                        {hasActiveSummaryFilters
                          ? "Tente flexibilizar os filtros de qualificação"
                          : "Tente ajustar os filtros ou termos de busca"}
                      </p>
                    </div>
                  </li>
                )}
              </>
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
