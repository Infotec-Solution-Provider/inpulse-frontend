"use client";

import customersService from "@/lib/services/customers.service";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import { Customer } from "@in.pulse-crm/sdk";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import ContactsIcon from "@mui/icons-material/Contacts";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from "@mui/icons-material/Done";
import EditIcon from "@mui/icons-material/Edit";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import HomeIcon from "@mui/icons-material/Home";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplayIcon from "@mui/icons-material/Replay";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Pagination,
  Tooltip,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuthContext } from "../../../../../auth-context";
import {
  CustomerCallHistoryDetail,
  CustomerContactDetail,
  CustomerFullDetail,
  CustomerPurchaseDetail,
  CustomerScheduleDetail,
} from "./customer-crm-detail-modal.types";

interface CustomerCrmDetailModalProps {
  customerId: number;
  onClose: () => void;
  canEdit: boolean;
}

type TabValue =
  | "main"
  | "address"
  | "origin"
  | "contacts"
  | "observations"
  | "calls"
  | "phones"
  | "purchases"
  | "agenda";

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatCurrency(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  INAT_A: "Inativos Antigos",
  INAT_R: "Inativos Recentes",
  PROSPE: "Prospecção",
  ATIVOS: "Ativos",
};

const BRAZIL_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapa" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceara" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espirito Santo" },
  { code: "GO", name: "Goias" },
  { code: "MA", name: "Maranhao" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Para" },
  { code: "PB", name: "Paraiba" },
  { code: "PR", name: "Parana" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piaui" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondonia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "Sao Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

function parseCampaignName(name?: string | null): { base: string; type: string } {
  if (!name) {
    return { base: "", type: "" };
  }

  const [baseRaw, typeRaw] = name.split(" - ").map((part) => part.trim());
  return {
    base: baseRaw ?? "",
    type: typeRaw ?? "",
  };
}

function getUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export default function CustomerCrmDetailModal({ customerId, onClose, canEdit }: CustomerCrmDetailModalProps) {
  const { token } = useAuthContext();
  const [tab, setTab] = useState<TabValue>("main");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<CustomerFullDetail | null>(null);

  const [mainDraft, setMainDraft] = useState<Partial<Customer>>({});
  const [addressDraft, setAddressDraft] = useState<Partial<Customer>>({});
  const [observationsDraft, setObservationsDraft] = useState<Partial<Customer>>({});
  const [phonesDraft, setPhonesDraft] = useState<Partial<Customer>>({});
  const [originDraft, setOriginDraft] = useState<Partial<Customer>>({});
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactEditDraft, setContactEditDraft] = useState<Partial<CustomerContactDetail>>({});
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactDraft, setNewContactDraft] = useState<Partial<CustomerContactDetail>>({});
  const [savingContact, setSavingContact] = useState(false);
  const [callsChannelFilter, setCallsChannelFilter] = useState<"all" | "call" | "whatsapp">("all");
  const [callsResultFilter, setCallsResultFilter] = useState("");
  const [callsOperatorFilter, setCallsOperatorFilter] = useState("");
  const [callsPhoneFilter, setCallsPhoneFilter] = useState("");
  const [callsObservationFilter, setCallsObservationFilter] = useState("");
  const [callsChatFilter, setCallsChatFilter] = useState("");
  const [callsPage, setCallsPage] = useState(1);
  const [callsPerPage, setCallsPerPage] = useState(10);
  const [agendaCampaignFilter, setAgendaCampaignFilter] = useState("");
  const [agendaOperatorFilter, setAgendaOperatorFilter] = useState("");
  const [agendaLinkedOperatorFilter, setAgendaLinkedOperatorFilter] = useState("");
  const [agendaPhoneFilter, setAgendaPhoneFilter] = useState("");
  const [agendaConcludedFilter, setAgendaConcludedFilter] = useState<"all" | "SIM" | "NAO">("all");
  const [agendaPage, setAgendaPage] = useState(1);
  const [agendaPerPage, setAgendaPerPage] = useState(10);
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState("");
  const [purchasePaymentFilter, setPurchasePaymentFilter] = useState("");
  const [purchaseSituationFilter, setPurchaseSituationFilter] = useState<"all" | "F" | "C">("all");
  const [purchaseDescriptionFilter, setPurchaseDescriptionFilter] = useState("");
  const [purchaseItemsFilter, setPurchaseItemsFilter] = useState<"all" | "with-items" | "without-items">("all");
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePerPage, setPurchasePerPage] = useState(10);
  const [stateCities, setStateCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const loadDetail = async () => {
    if (!token) return;

    setLoading(true);
    try {
      customersService.setAuth(token);
      const response = await customersService.ax.get<{ message: string; data: CustomerFullDetail }>(
        `/api/customers/${customerId}/full`
      );
      const payload = response.data.data;

      setDetail(payload);
      setMainDraft({
        RAZAO: payload.customer.RAZAO,
        FANTASIA: payload.customer.FANTASIA,
        COD_CAMPANHA: payload.customer.COD_CAMPANHA,
        PESSOA: payload.customer.PESSOA,
        ATIVO: payload.customer.ATIVO,
        COD_ERP: payload.customer.COD_ERP,
        CPF_CNPJ: payload.customer.CPF_CNPJ,
        IE_RG: payload.customer.IE_RG,
      });
      setAddressDraft({
        END_RUA: payload.customer.END_RUA,
        CIDADE: payload.customer.CIDADE,
        BAIRRO: payload.customer.BAIRRO,
        ESTADO: payload.customer.ESTADO,
        CEP: payload.customer.CEP,
        COMPLEMENTO: payload.customer.COMPLEMENTO,
      });
      setObservationsDraft({
        OBS_ADMIN: payload.customer.OBS_ADMIN,
        OBS_OPERADOR: payload.customer.OBS_OPERADOR,
      });
      setPhonesDraft({
        AREA1: payload.customer.AREA1,
        FONE1: payload.customer.FONE1,
        DESC_FONE1: payload.customer.DESC_FONE1,
        AREA2: payload.customer.AREA2,
        FONE2: payload.customer.FONE2,
        DESC_FONE2: payload.customer.DESC_FONE2,
        AREA3: payload.customer.AREA3,
        FONE3: payload.customer.FONE3,
        DESC_FONE3: payload.customer.DESC_FONE3,
        AREAFAX: payload.customer.AREAFAX,
        FAX: payload.customer.FAX,
        DESCFAX: payload.customer.DESCFAX,
      });
      setOriginDraft({
        EMAIL: payload.customer.EMAIL,
        EMAIL2: payload.customer.EMAIL2,
        CONTATO_MAIL: payload.customer.CONTATO_MAIL,
        WEBSITE: payload.customer.WEBSITE,
        NR_FUNCIONARIOS: payload.customer.NR_FUNCIONARIOS,
      });
    } catch (error) {
      toast.error("Não foi possível carregar os detalhes do cliente.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [customerId, token]);

  useEffect(() => {
    const stateCode = String(addressDraft.ESTADO ?? "").trim().toUpperCase();

    if (!stateCode || stateCode.length !== 2) {
      setStateCities([]);
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      setLoadingCities(true);

      try {
        const instancesApiUrl = process.env["NEXT_PUBLIC_INSTANCES_URL"] || "http://localhost:8000";
        const response = await fetch(
          `${instancesApiUrl}/api/instances/geo/states/${stateCode}/cities`
        );

        if (!response.ok) {
          throw new Error(`Unable to fetch cities for state ${stateCode}`);
        }

        const payload = (await response.json()) as { data: string[] };
        if (!cancelled) {
          setStateCities(payload.data.sort((a, b) => a.localeCompare(b)));
        }
      } catch (error) {
        if (!cancelled) {
          setStateCities([]);
        }
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoadingCities(false);
        }
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [addressDraft.ESTADO]);

  const canEditMain = canEdit;
  const canEditAddress = canEdit;
  const canEditObservations = canEdit;
  const canEditPhones = canEdit;

  const resetMainDraft = () => {
    if (!detail) return;
    setMainDraft({
      RAZAO: detail.customer.RAZAO,
      FANTASIA: detail.customer.FANTASIA,
      COD_CAMPANHA: detail.customer.COD_CAMPANHA,
      PESSOA: detail.customer.PESSOA,
      ATIVO: detail.customer.ATIVO,
      COD_ERP: detail.customer.COD_ERP,
      CPF_CNPJ: detail.customer.CPF_CNPJ,
      IE_RG: detail.customer.IE_RG,
    });
  };

  const resetAddressDraft = () => {
    if (!detail) return;
    setAddressDraft({
      END_RUA: detail.customer.END_RUA,
      CIDADE: detail.customer.CIDADE,
      BAIRRO: detail.customer.BAIRRO,
      ESTADO: detail.customer.ESTADO,
      CEP: detail.customer.CEP,
      COMPLEMENTO: detail.customer.COMPLEMENTO,
    });
  };

  const resetObservationsDraft = () => {
    if (!detail) return;
    setObservationsDraft({
      OBS_ADMIN: detail.customer.OBS_ADMIN,
      OBS_OPERADOR: detail.customer.OBS_OPERADOR,
    });
  };

  const resetPhonesDraft = () => {
    if (!detail) return;
    setPhonesDraft({
      AREA1: detail.customer.AREA1,
      FONE1: detail.customer.FONE1,
      DESC_FONE1: detail.customer.DESC_FONE1,
      AREA2: detail.customer.AREA2,
      FONE2: detail.customer.FONE2,
      DESC_FONE2: detail.customer.DESC_FONE2,
      AREA3: detail.customer.AREA3,
      FONE3: detail.customer.FONE3,
      DESC_FONE3: detail.customer.DESC_FONE3,
      AREAFAX: detail.customer.AREAFAX,
      FAX: detail.customer.FAX,
      DESCFAX: detail.customer.DESCFAX,
    });
  };

  const resetOriginDraft = () => {
    if (!detail) return;
    setOriginDraft({
      EMAIL: detail.customer.EMAIL,
      EMAIL2: detail.customer.EMAIL2,
      CONTATO_MAIL: detail.customer.CONTATO_MAIL,
      WEBSITE: detail.customer.WEBSITE,
      NR_FUNCIONARIOS: detail.customer.NR_FUNCIONARIOS,
    });
  };

  const hasDraftChanges = <T extends Partial<Customer>>(draft: T, base: T) =>
    JSON.stringify(draft) !== JSON.stringify(base);

  const baseMainDraft = useMemo(
    () => ({
      RAZAO: detail?.customer.RAZAO,
      FANTASIA: detail?.customer.FANTASIA,
      COD_CAMPANHA: detail?.customer.COD_CAMPANHA,
      PESSOA: detail?.customer.PESSOA,
      ATIVO: detail?.customer.ATIVO,
      COD_ERP: detail?.customer.COD_ERP,
      CPF_CNPJ: detail?.customer.CPF_CNPJ,
      IE_RG: detail?.customer.IE_RG,
    }),
    [detail]
  );

  const baseAddressDraft = useMemo(
    () => ({
      END_RUA: detail?.customer.END_RUA,
      CIDADE: detail?.customer.CIDADE,
      BAIRRO: detail?.customer.BAIRRO,
      ESTADO: detail?.customer.ESTADO,
      CEP: detail?.customer.CEP,
      COMPLEMENTO: detail?.customer.COMPLEMENTO,
    }),
    [detail]
  );

  const baseObservationsDraft = useMemo(
    () => ({
      OBS_ADMIN: detail?.customer.OBS_ADMIN,
      OBS_OPERADOR: detail?.customer.OBS_OPERADOR,
    }),
    [detail]
  );

  const basePhonesDraft = useMemo(
    () => ({
      AREA1: detail?.customer.AREA1,
      FONE1: detail?.customer.FONE1,
      DESC_FONE1: detail?.customer.DESC_FONE1,
      AREA2: detail?.customer.AREA2,
      FONE2: detail?.customer.FONE2,
      DESC_FONE2: detail?.customer.DESC_FONE2,
      AREA3: detail?.customer.AREA3,
      FONE3: detail?.customer.FONE3,
      DESC_FONE3: detail?.customer.DESC_FONE3,
      AREAFAX: detail?.customer.AREAFAX,
      FAX: detail?.customer.FAX,
      DESCFAX: detail?.customer.DESCFAX,
    }),
    [detail]
  );

  const baseOriginDraft = useMemo(
    () => ({
      EMAIL: detail?.customer.EMAIL,
      EMAIL2: detail?.customer.EMAIL2,
      CONTATO_MAIL: detail?.customer.CONTATO_MAIL,
      WEBSITE: detail?.customer.WEBSITE,
      NR_FUNCIONARIOS: detail?.customer.NR_FUNCIONARIOS,
    }),
    [detail]
  );

  const hasMainChanges = useMemo(
    () => hasDraftChanges(mainDraft, baseMainDraft),
    [mainDraft, baseMainDraft]
  );
  const hasAddressChanges = useMemo(
    () => hasDraftChanges(addressDraft, baseAddressDraft),
    [addressDraft, baseAddressDraft]
  );
  const hasObservationsChanges = useMemo(
    () => hasDraftChanges(observationsDraft, baseObservationsDraft),
    [observationsDraft, baseObservationsDraft]
  );
  const hasPhonesChanges = useMemo(
    () => hasDraftChanges(phonesDraft, basePhonesDraft),
    [phonesDraft, basePhonesDraft]
  );
  const hasOriginChanges = useMemo(
    () => hasDraftChanges(originDraft, baseOriginDraft),
    [originDraft, baseOriginDraft]
  );

  const renderEditActions = (
    canEditTab: boolean,
    hasChanges: boolean,
    onConfirm: () => void,
    onDiscard: () => void
  ) => {
    if (!canEditTab) {
      return null;
    }

    return (
      <Box className="md:col-span-2 flex justify-end gap-1">
        <Tooltip title="Descartar alterações">
          <span>
            <IconButton onClick={onDiscard} disabled={saving || !hasChanges} color="default">
              <ReplayIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Confirmar alterações">
          <span>
            <IconButton onClick={onConfirm} disabled={saving || !hasChanges} color="primary">
              <DoneIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  const canEditOrigin = canEdit;

  const savePatch = async (payload: Partial<Customer>, successMessage: string) => {
    if (!token) return;

    setSaving(true);
    try {
      customersService.setAuth(token);
      await customersService.updateCustomer(customerId, payload);
      toast.success(successMessage);
      await loadDetail();
    } catch (error) {
      toast.error("Não foi possível salvar as alterações desta aba.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const saveEditContact = async () => {
    if (!token || !editingContactId) return;
    setSavingContact(true);
    try {
      customersService.setAuth(token);
      await customersService.ax.patch(
        `/api/customers/${customerId}/contacts/${editingContactId}`,
        contactEditDraft
      );
      toast.success("Contato atualizado com sucesso.");
      setEditingContactId(null);
      await loadDetail();
    } catch (error) {
      toast.error("Não foi possível atualizar o contato.");
      console.error(error);
    } finally {
      setSavingContact(false);
    }
  };

  const saveNewContact = async () => {
    if (!token) return;
    if (!newContactDraft.NOME?.trim()) {
      toast.error("Nome do contato é obrigatório.");
      return;
    }
    setSavingContact(true);
    try {
      customersService.setAuth(token);
      await customersService.ax.post(`/api/customers/${customerId}/contacts`, newContactDraft);
      toast.success("Contato adicionado com sucesso.");
      setShowNewContact(false);
      setNewContactDraft({});
      await loadDetail();
    } catch (error) {
      toast.error("Não foi possível adicionar o contato.");
      console.error(error);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!token) return;
    setSavingContact(true);
    try {
      customersService.setAuth(token);
      await customersService.ax.delete(`/api/customers/${customerId}/contacts/${contactId}`);
      toast.success("Contato removido com sucesso.");
      await loadDetail();
    } catch (error) {
      toast.error("Não foi possível remover o contato.");
      console.error(error);
    } finally {
      setSavingContact(false);
    }
  };

  const renderContactForm = (
    draft: Partial<CustomerContactDetail>,
    onChange: (patch: Partial<CustomerContactDetail>) => void,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
      <TextField
        label="Nome *"
        value={draft.NOME ?? ""}
        onChange={(e) => onChange({ NOME: e.target.value })}
      />
      <TextField
        label="Tratamento"
        value={draft.TRATAMENTO ?? ""}
        onChange={(e) => onChange({ TRATAMENTO: e.target.value })}
      />
      <TextField
        label="Email"
        value={draft.EMAIL ?? ""}
        onChange={(e) => onChange({ EMAIL: e.target.value })}
      />
      <TextField
        label="Cargo"
        type="number"
        value={draft.CARGO ?? ""}
        onChange={(e) =>
          onChange({ CARGO: e.target.value === "" ? null : Number(e.target.value) })
        }
      />
      <TextField
        label="Área (direto)"
        value={draft.AREA_DIRETO ?? ""}
        onChange={(e) => onChange({ AREA_DIRETO: e.target.value })}
      />
      <TextField
        label="Fone direto"
        value={draft.FONE_DIRETO ?? ""}
        onChange={(e) => onChange({ FONE_DIRETO: e.target.value })}
      />
      <TextField
        label="Área (cel)"
        value={draft.AREA_CEL ?? ""}
        onChange={(e) => onChange({ AREA_CEL: e.target.value })}
      />
      <TextField
        label="Celular"
        value={draft.CELULAR ?? ""}
        onChange={(e) => onChange({ CELULAR: e.target.value })}
      />
      <TextField
        label="Área (resi)"
        value={draft.AREA_RESI ?? ""}
        onChange={(e) => onChange({ AREA_RESI: e.target.value })}
      />
      <TextField
        label="Fone residencial"
        value={draft.FONE_RESIDENCIAL ?? ""}
        onChange={(e) => onChange({ FONE_RESIDENCIAL: e.target.value })}
      />
      <TextField
        select
        label="Sexo"
        value={draft.SEXO ?? ""}
        onChange={(e) =>
          onChange({ SEXO: (e.target.value as "M" | "F") || null })
        }
      >
        <MenuItem value="">-</MenuItem>
        <MenuItem value="M">Masculino</MenuItem>
        <MenuItem value="F">Feminino</MenuItem>
      </TextField>
      <TextField
        label="Filhos"
        type="number"
        value={draft.FILHOS ?? ""}
        onChange={(e) => onChange({ FILHOS: e.target.value === "" ? 0 : Number(e.target.value) })}
      />
      <Box className="md:col-span-2 flex justify-end gap-1">
        <Tooltip title="Cancelar">
          <span>
            <IconButton onClick={onCancel} disabled={savingContact} color="default">
              <ReplayIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Salvar">
          <span>
            <IconButton onClick={onSave} disabled={savingContact} color="primary">
              <DoneIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </div>
  );

  const campaignLookupByCode = useMemo(() => {
    return new Map((detail?.campaigns ?? []).map((campaign) => [campaign.code, campaign]));
  }, [detail]);

  const groupedCampaigns = useMemo(() => {
    const grouped = new Map<string, Map<string, number>>();

    for (const campaign of detail?.campaigns ?? []) {
      const parsed = parseCampaignName(campaign.name);
      if (!parsed.base || !parsed.type) {
        continue;
      }

      if (!grouped.has(parsed.base)) {
        grouped.set(parsed.base, new Map<string, number>());
      }

      grouped.get(parsed.base)?.set(parsed.type, campaign.code);
    }

    return grouped;
  }, [detail]);

  const currentCampaign = useMemo(() => {
    if (typeof mainDraft.COD_CAMPANHA !== "number") {
      return undefined;
    }

    return campaignLookupByCode.get(mainDraft.COD_CAMPANHA);
  }, [campaignLookupByCode, mainDraft.COD_CAMPANHA]);

  const selectedCampaignParsed = useMemo(
    () => parseCampaignName(currentCampaign?.name),
    [currentCampaign]
  );

  const campaignBaseOptions = useMemo(() => {
    return Array.from(groupedCampaigns.keys()).sort((a, b) => a.localeCompare(b));
  }, [groupedCampaigns]);

  const campaignTypeOptions = useMemo(() => {
    if (!selectedCampaignParsed.base) {
      return [];
    }

    const typeMap = groupedCampaigns.get(selectedCampaignParsed.base);
    if (!typeMap) {
      return [];
    }

    return ["INAT_A", "INAT_R", "PROSPE", "ATIVOS"].filter((type) => typeMap.has(type));
  }, [groupedCampaigns, selectedCampaignParsed.base]);

  const callsResultOptions = useMemo(
    () => getUniqueOptions((detail?.callHistory ?? []).map((call) => call.RESULTADO_NOME ?? String(call.RESULTADO ?? ""))),
    [detail?.callHistory]
  );

  const callsOperatorOptions = useMemo(
    () => getUniqueOptions((detail?.callHistory ?? []).map((call) => String(call.OPERADOR ?? ""))),
    [detail?.callHistory]
  );

  const filteredCallHistory = useMemo(() => {
    const history = detail?.callHistory ?? [];
    const normalizedResult = callsResultFilter.trim().toLocaleLowerCase("pt-BR");
    const normalizedOperator = callsOperatorFilter.trim().toLocaleLowerCase("pt-BR");
    const normalizedPhone = callsPhoneFilter.trim().toLocaleLowerCase("pt-BR");
    const normalizedObservation = callsObservationFilter.trim().toLocaleLowerCase("pt-BR");
    const normalizedChat = callsChatFilter.trim().toLocaleLowerCase("pt-BR");

    return history.filter((call) => {
      const isWhatsapp = call.CANAL_ATENDIMENTO === "WhatsApp";

      if (callsChannelFilter === "whatsapp" && !isWhatsapp) {
        return false;
      }

      if (callsChannelFilter === "call" && isWhatsapp) {
        return false;
      }

      if (normalizedResult) {
        const resultField = `${call.RESULTADO_NOME ?? ""} ${String(call.RESULTADO ?? "")}`
          .toLocaleLowerCase("pt-BR");

        if (!resultField.includes(normalizedResult)) {
          return false;
        }
      }

      if (normalizedOperator) {
        const operatorField = String(call.OPERADOR ?? "").toLocaleLowerCase("pt-BR");

        if (!operatorField.includes(normalizedOperator)) {
          return false;
        }
      }

      if (normalizedPhone) {
        const phoneField = `${call.FONE_RECEPTIVO ?? ""} ${call.WHATSAPP_CONTATO_FONE ?? ""}`
          .toLocaleLowerCase("pt-BR");

        if (!phoneField.includes(normalizedPhone)) {
          return false;
        }
      }

      if (normalizedObservation) {
        const observationField = String(call.OBS ?? "").toLocaleLowerCase("pt-BR");

        if (!observationField.includes(normalizedObservation)) {
          return false;
        }
      }

      if (normalizedChat) {
        const chatField = `${String(call.WHATSAPP_CHAT_ID ?? "")} ${call.WHATSAPP_CONTATO_NOME ?? ""}`
          .toLocaleLowerCase("pt-BR");

        if (!chatField.includes(normalizedChat)) {
          return false;
        }
      }

      return true;
    });
  }, [
    callsChannelFilter,
    callsChatFilter,
    callsObservationFilter,
    callsOperatorFilter,
    callsPhoneFilter,
    callsResultFilter,
    detail?.callHistory,
  ]);

  const paginatedCallHistory = useMemo(() => {
    const startIndex = (callsPage - 1) * callsPerPage;
    return filteredCallHistory.slice(startIndex, startIndex + callsPerPage);
  }, [callsPage, callsPerPage, filteredCallHistory]);

  const callPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCallHistory.length / callsPerPage));
  }, [callsPerPage, filteredCallHistory.length]);

  const agendaCampaignOptions = useMemo(
    () => getUniqueOptions((detail?.schedules ?? []).map((schedule) => schedule.CAMPANHA_NOME ?? String(schedule.CAMPANHA ?? ""))),
    [detail?.schedules]
  );

  const agendaOperatorOptions = useMemo(
    () => getUniqueOptions((detail?.schedules ?? []).map((schedule) => schedule.OPERADOR_NOME ?? String(schedule.OPERADOR ?? ""))),
    [detail?.schedules]
  );

  const agendaLinkedOperatorOptions = useMemo(
    () => getUniqueOptions((detail?.schedules ?? []).map((schedule) => schedule.OPERADOR_LIGACAO_NOME ?? String(schedule.OPERADOR_LIGACAO ?? ""))),
    [detail?.schedules]
  );

  const filteredAgenda = useMemo(() => {
    return (detail?.schedules ?? []).filter((schedule) => {
      const campaignField = `${schedule.CAMPANHA_NOME ?? ""} ${String(schedule.CAMPANHA ?? "")}`.toLocaleLowerCase("pt-BR");
      const operatorField = `${schedule.OPERADOR_NOME ?? ""} ${String(schedule.OPERADOR ?? "")}`.toLocaleLowerCase("pt-BR");
      const linkedOperatorField = `${schedule.OPERADOR_LIGACAO_NOME ?? ""} ${String(schedule.OPERADOR_LIGACAO ?? "")}`.toLocaleLowerCase("pt-BR");
      const phoneField = `${schedule.FONE1 ?? ""} ${schedule.FONE2 ?? ""} ${schedule.FONE3 ?? ""} ${schedule.TELEFONE_LIGADO ?? ""}`.toLocaleLowerCase("pt-BR");

      if (agendaCampaignFilter && !campaignField.includes(agendaCampaignFilter.trim().toLocaleLowerCase("pt-BR"))) {
        return false;
      }

      if (agendaOperatorFilter && !operatorField.includes(agendaOperatorFilter.trim().toLocaleLowerCase("pt-BR"))) {
        return false;
      }

      if (agendaLinkedOperatorFilter && !linkedOperatorField.includes(agendaLinkedOperatorFilter.trim().toLocaleLowerCase("pt-BR"))) {
        return false;
      }

      if (agendaPhoneFilter && !phoneField.includes(agendaPhoneFilter.trim().toLocaleLowerCase("pt-BR"))) {
        return false;
      }

      if (agendaConcludedFilter !== "all" && schedule.CONCLUIDO !== agendaConcludedFilter) {
        return false;
      }

      return true;
    });
  }, [
    agendaCampaignFilter,
    agendaConcludedFilter,
    agendaLinkedOperatorFilter,
    agendaOperatorFilter,
    agendaPhoneFilter,
    detail?.schedules,
  ]);

  const paginatedAgenda = useMemo(() => {
    const startIndex = (agendaPage - 1) * agendaPerPage;
    return filteredAgenda.slice(startIndex, startIndex + agendaPerPage);
  }, [agendaPage, agendaPerPage, filteredAgenda]);

  const agendaPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAgenda.length / agendaPerPage));
  }, [agendaPerPage, filteredAgenda.length]);

  const purchaseTypeOptions = useMemo(
    () => getUniqueOptions((detail?.purchases ?? []).map((purchase) => purchase.TIPO)),
    [detail?.purchases]
  );

  const purchasePaymentOptions = useMemo(
    () => getUniqueOptions((detail?.purchases ?? []).map((purchase) => purchase.FORMA_PGTO)),
    [detail?.purchases]
  );

  const filteredPurchases = useMemo(() => {
    return (detail?.purchases ?? []).filter((purchase) => {
      const descriptionField = String(purchase.DESCRICAO ?? "").toLocaleLowerCase("pt-BR");

      if (purchaseTypeFilter && String(purchase.TIPO ?? "").toLocaleLowerCase("pt-BR") !== purchaseTypeFilter.trim().toLocaleLowerCase("pt-BR")) {
        return false;
      }

      if (purchasePaymentFilter && String(purchase.FORMA_PGTO ?? "").toLocaleLowerCase("pt-BR") !== purchasePaymentFilter.trim().toLocaleLowerCase("pt-BR")) {
        return false;
      }

      if (purchaseSituationFilter !== "all" && purchase.SITUACAO !== purchaseSituationFilter) {
        return false;
      }

      if (purchaseDescriptionFilter && !descriptionField.includes(purchaseDescriptionFilter.trim().toLocaleLowerCase("pt-BR"))) {
        return false;
      }

      if (purchaseItemsFilter === "with-items" && purchase.items.length === 0) {
        return false;
      }

      if (purchaseItemsFilter === "without-items" && purchase.items.length > 0) {
        return false;
      }

      return true;
    });
  }, [
    detail?.purchases,
    purchaseDescriptionFilter,
    purchaseItemsFilter,
    purchasePaymentFilter,
    purchaseSituationFilter,
    purchaseTypeFilter,
  ]);

  const paginatedPurchases = useMemo(() => {
    const startIndex = (purchasePage - 1) * purchasePerPage;
    return filteredPurchases.slice(startIndex, startIndex + purchasePerPage);
  }, [purchasePage, purchasePerPage, filteredPurchases]);

  const purchasePageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredPurchases.length / purchasePerPage));
  }, [purchasePerPage, filteredPurchases.length]);

  useEffect(() => {
    setCallsPage(1);
  }, [
    callsChannelFilter,
    callsChatFilter,
    callsObservationFilter,
    callsOperatorFilter,
    callsPerPage,
    callsPhoneFilter,
    callsResultFilter,
  ]);

  useEffect(() => {
    setAgendaPage(1);
  }, [
    agendaCampaignFilter,
    agendaConcludedFilter,
    agendaLinkedOperatorFilter,
    agendaOperatorFilter,
    agendaPerPage,
    agendaPhoneFilter,
  ]);

  useEffect(() => {
    if (agendaPage > agendaPageCount) {
      setAgendaPage(agendaPageCount);
    }
  }, [agendaPage, agendaPageCount]);

  useEffect(() => {
    setPurchasePage(1);
  }, [
    purchaseDescriptionFilter,
    purchaseItemsFilter,
    purchasePaymentFilter,
    purchasePerPage,
    purchaseSituationFilter,
    purchaseTypeFilter,
  ]);

  useEffect(() => {
    if (purchasePage > purchasePageCount) {
      setPurchasePage(purchasePageCount);
    }
  }, [purchasePage, purchasePageCount]);

  useEffect(() => {
    if (callsPage > callPageCount) {
      setCallsPage(callPageCount);
    }
  }, [callPageCount, callsPage]);

  const handleCampaignBaseChange = (baseName: string) => {
    const typeMap = groupedCampaigns.get(baseName);
    if (!typeMap || typeMap.size === 0) {
      return;
    }

    const preservedType = selectedCampaignParsed.type;
    const nextCode =
      (preservedType ? typeMap.get(preservedType) : undefined) ?? Array.from(typeMap.values())[0];

    if (typeof nextCode !== "number") {
      return;
    }

    setMainDraft((prev) => ({ ...prev, COD_CAMPANHA: nextCode }));
  };

  const handleCampaignTypeChange = (type: string) => {
    const baseName = selectedCampaignParsed.base;
    const typeMap = groupedCampaigns.get(baseName);
    const nextCode = typeMap?.get(type);

    if (typeof nextCode !== "number") {
      return;
    }

    setMainDraft((prev) => ({ ...prev, COD_CAMPANHA: nextCode }));
  };

  const renderMain = () => {
    const customer = detail?.customer;
    if (!customer) return null;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Código" value={customer.CODIGO} InputProps={{ readOnly: true }} />
        <TextField
          label="Razão Social"
          value={mainDraft.RAZAO ?? ""}
          onChange={(e) => setMainDraft((prev) => ({ ...prev, RAZAO: e.target.value }))}
          InputProps={{ readOnly: !canEditMain }}
        />
        <TextField
          label="Nome Fantasia"
          value={mainDraft.FANTASIA ?? ""}
          onChange={(e) => setMainDraft((prev) => ({ ...prev, FANTASIA: e.target.value }))}
          InputProps={{ readOnly: !canEditMain }}
        />
        <TextField
          select
          label="Campanha"
          value={selectedCampaignParsed.base || ""}
          onChange={(e) => handleCampaignBaseChange(e.target.value)}
          InputProps={{ readOnly: !canEditMain }}
          disabled={!canEditMain}
        >
          {campaignBaseOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Carteira"
          value={selectedCampaignParsed.type || ""}
          onChange={(e) => handleCampaignTypeChange(e.target.value)}
          InputProps={{ readOnly: !canEditMain }}
          disabled={!canEditMain || !selectedCampaignParsed.base}
        >
          {campaignTypeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {`${selectedCampaignParsed.base} - ${option}`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Tipo Pessoa"
          value={mainDraft.PESSOA ?? ""}
          onChange={(e) => setMainDraft((prev) => ({ ...prev, PESSOA: e.target.value as Customer["PESSOA"] }))}
          disabled={!canEditMain}
        >
          <MenuItem value="FIS">Fisica</MenuItem>
          <MenuItem value="JUR">Juridica</MenuItem>
        </TextField>
        <TextField
          select
          label="Ativo"
          value={mainDraft.ATIVO ?? ""}
          onChange={(e) => setMainDraft((prev) => ({ ...prev, ATIVO: e.target.value as Customer["ATIVO"] }))}
          disabled={!canEditMain}
        >
          <MenuItem value="SIM">SIM</MenuItem>
          <MenuItem value="NAO">NAO</MenuItem>
        </TextField>
        <TextField
          label="Código ERP"
          value={mainDraft.COD_ERP ?? ""}
          onChange={(e) => setMainDraft((prev) => ({ ...prev, COD_ERP: e.target.value }))}
          InputProps={{ readOnly: !canEditMain }}
        />
        <TextField
          label="CPF/CNPJ"
          value={formatCpfCnpj(mainDraft.CPF_CNPJ || "")}
          onChange={(e) =>
            setMainDraft((prev) => ({ ...prev, CPF_CNPJ: e.target.value.replace(/\D/g, "") }))
          }
          InputProps={{ readOnly: !canEditMain }}
        />
        <TextField
          label="IE/RG"
          value={mainDraft.IE_RG ?? ""}
          onChange={(e) => setMainDraft((prev) => ({ ...prev, IE_RG: e.target.value }))}
          InputProps={{ readOnly: !canEditMain }}
        />

        {renderEditActions(
          canEditMain,
          hasMainChanges,
          () => savePatch(mainDraft, "Dados principais atualizados com sucesso."),
          resetMainDraft
        )}
      </div>
    );
  };

  const renderAddress = () => {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Rua"
          value={addressDraft.END_RUA ?? ""}
          onChange={(e) => setAddressDraft((prev) => ({ ...prev, END_RUA: e.target.value }))}
          slotProps={{ input: { readOnly: !canEditAddress } }}
        />
        <Autocomplete
          options={stateCities}
          freeSolo
          loading={loadingCities}
          value={addressDraft.CIDADE ?? ""}
          onInputChange={(_, value) => {
            setAddressDraft((prev) => ({ ...prev, CIDADE: value }));
          }}
          onChange={(_, value) => {
            setAddressDraft((prev) => ({ ...prev, CIDADE: value ?? "" }));
          }}
          disabled={!canEditAddress}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Cidade"
              InputProps={{
                ...params.InputProps,
                readOnly: !canEditAddress,
              }}
            />
          )}
        />
        <TextField
          label="Bairro"
          value={addressDraft.BAIRRO ?? ""}
          onChange={(e) => setAddressDraft((prev) => ({ ...prev, BAIRRO: e.target.value }))}
          slotProps={{ input: { readOnly: !canEditAddress } }}
        />
        <TextField
          select
          label="Estado"
          value={addressDraft.ESTADO ?? ""}
          onChange={(e) => setAddressDraft((prev) => ({ ...prev, ESTADO: e.target.value }))}
          disabled={!canEditAddress}
        >
          {BRAZIL_STATES.map((state) => (
            <MenuItem key={state.code} value={state.code}>
              {state.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="CEP"
          value={addressDraft.CEP ?? ""}
          onChange={(e) => setAddressDraft((prev) => ({ ...prev, CEP: e.target.value }))}
          slotProps={{ input: { readOnly: !canEditAddress } }}
        />
        <TextField
          label="Complemento"
          value={addressDraft.COMPLEMENTO ?? ""}
          onChange={(e) => setAddressDraft((prev) => ({ ...prev, COMPLEMENTO: e.target.value }))}
          slotProps={{ input: { readOnly: !canEditAddress } }}
        />

        {renderEditActions(
          canEditAddress,
          hasAddressChanges,
          () => savePatch(addressDraft, "Endereço atualizado com sucesso."),
          resetAddressDraft
        )}
      </div>
    );
  };

  const renderOrigin = () => {
    if (!detail) return null;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Grupo" value={detail.group.description ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Origem" value={detail.origin.description ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Mídia" value={detail.media.name ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Operador" value={detail.operator.name ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Segmento" value={detail.segment.name ?? "-"} InputProps={{ readOnly: true }} />
        <TextField
          label="Funcionários"
          type="number"
          value={originDraft.NR_FUNCIONARIOS ?? ""}
          onChange={(e) =>
            setOriginDraft((prev) => ({
              ...prev,
              NR_FUNCIONARIOS: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
          InputProps={{ readOnly: !canEditOrigin }}
        />
        <TextField
          label="Email"
          value={originDraft.EMAIL ?? ""}
          onChange={(e) => setOriginDraft((prev) => ({ ...prev, EMAIL: e.target.value }))}
          InputProps={{ readOnly: !canEditOrigin }}
        />
        <TextField
          label="Email 2"
          value={originDraft.EMAIL2 ?? ""}
          onChange={(e) => setOriginDraft((prev) => ({ ...prev, EMAIL2: e.target.value }))}
          InputProps={{ readOnly: !canEditOrigin }}
        />
        <TextField
          label="Contato E-mail"
          value={originDraft.CONTATO_MAIL ?? ""}
          onChange={(e) => setOriginDraft((prev) => ({ ...prev, CONTATO_MAIL: e.target.value }))}
          InputProps={{ readOnly: !canEditOrigin }}
        />
        <TextField
          label="Website"
          value={originDraft.WEBSITE ?? ""}
          onChange={(e) => setOriginDraft((prev) => ({ ...prev, WEBSITE: e.target.value }))}
          InputProps={{ readOnly: !canEditOrigin }}
        />
        <TextField
          label="Nome customizável"
          value={detail.metadata.customNameFieldMapped ? "Mapeado" : "Não mapeado no CRM"}
          InputProps={{ readOnly: true }}
        />

        {renderEditActions(
          canEditOrigin,
          hasOriginChanges,
          () => savePatch(originDraft, "Origem atualizada com sucesso."),
          resetOriginDraft
        )}
      </div>
    );
  };

  const renderContacts = () => {
    if (!detail) return null;

    const canEditContacts = canEdit;

    return (
      <div className="space-y-3">
        {canEditContacts && (
          <Box className="flex justify-end">
            <Tooltip title="Adicionar contato">
              <span>
                <IconButton
                  color="primary"
                  onClick={() => {
                    setShowNewContact(true);
                    setNewContactDraft({});
                  }}
                  disabled={savingContact || showNewContact}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}

        {showNewContact && (
          <Box className="rounded-lg border border-blue-300 dark:border-blue-700 overflow-hidden">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 dark:bg-blue-900/30">
              <AddIcon fontSize="small" className="text-blue-500" />
              <Typography fontWeight={700}>Novo contato</Typography>
            </div>
            <Divider />
            {renderContactForm(
              newContactDraft,
              (patch) => setNewContactDraft((prev) => ({ ...prev, ...patch })),
              saveNewContact,
              () => {
                setShowNewContact(false);
                setNewContactDraft({});
              }
            )}
          </Box>
        )}

        {!detail.contacts.length && !showNewContact && (
          <Alert severity="info">Nenhum contato encontrado para este cliente.</Alert>
        )}

        {detail.contacts.map((contact) => {
          const isEditing = editingContactId === contact.CODIGO;

          return (
            <Box
              key={contact.CODIGO}
              className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <ContactsIcon fontSize="small" className="text-slate-500" />
                  <Typography fontWeight={700}>{contact.NOME}</Typography>
                  {contact.CARGO ? (
                    <Chip label={String(contact.CARGO)} size="small" variant="outlined" />
                  ) : null}
                </div>
                {canEditContacts && !isEditing && (
                  <Box className="flex gap-0.5">
                    <Tooltip title="Editar contato">
                      <span>
                        <IconButton
                          size="small"
                          disabled={savingContact}
                          onClick={() => {
                            setEditingContactId(contact.CODIGO);
                            setContactEditDraft({
                              NOME: contact.NOME,
                              EMAIL: contact.EMAIL,
                              TRATAMENTO: contact.TRATAMENTO,
                              CARGO: contact.CARGO,
                              AREA_DIRETO: contact.AREA_DIRETO,
                              FONE_DIRETO: contact.FONE_DIRETO,
                              AREA_CEL: contact.AREA_CEL,
                              CELULAR: contact.CELULAR,
                              AREA_RESI: contact.AREA_RESI,
                              FONE_RESIDENCIAL: contact.FONE_RESIDENCIAL,
                              SEXO: contact.SEXO,
                              FILHOS: contact.FILHOS,
                            });
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remover contato">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={savingContact}
                          onClick={() => handleDeleteContact(contact.CODIGO)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                )}
              </div>
              <Divider />
              {isEditing ? (
                renderContactForm(
                  contactEditDraft,
                  (patch) => setContactEditDraft((prev) => ({ ...prev, ...patch })),
                  saveEditContact,
                  () => setEditingContactId(null)
                )
              ) : (
                <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 md:grid-cols-2">
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Tratamento:</span>{" "}
                    {contact.TRATAMENTO ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Email:</span>{" "}
                    {contact.EMAIL ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Fone direto:</span> (
                    {contact.AREA_DIRETO ?? "-"}) {contact.FONE_DIRETO ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Celular:</span> (
                    {contact.AREA_CEL ?? "-"}) {contact.CELULAR ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Residencial:</span> (
                    {contact.AREA_RESI ?? "-"}) {contact.FONE_RESIDENCIAL ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Aniversário:</span>{" "}
                    {formatDate(contact.ANIVERSARIO)}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Sexo:</span>{" "}
                    {contact.SEXO ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    <span className="font-medium text-slate-500">Filhos:</span>{" "}
                    {String(contact.FILHOS ?? 0)}
                  </Typography>
                </div>
              )}
            </Box>
          );
        })}
      </div>
    );
  };

  const renderObservations = () => {
    return (
      <div className="grid grid-cols-1 gap-4">
        <TextField
          label="Observação do Administrador/Supervisor"
          value={observationsDraft.OBS_ADMIN ?? ""}
          multiline
          minRows={4}
          onChange={(e) => setObservationsDraft((prev) => ({ ...prev, OBS_ADMIN: e.target.value }))}
          InputProps={{ readOnly: !canEditObservations }}
        />
        <TextField
          label="Observação do Operador"
          value={observationsDraft.OBS_OPERADOR ?? ""}
          multiline
          minRows={4}
          onChange={(e) =>
            setObservationsDraft((prev) => ({ ...prev, OBS_OPERADOR: e.target.value }))
          }
          InputProps={{ readOnly: !canEditObservations }}
        />

        {renderEditActions(
          canEditObservations,
          hasObservationsChanges,
          () => savePatch(observationsDraft, "Observações atualizadas com sucesso."),
          resetObservationsDraft
        )}
      </div>
    );
  };

  const renderCalls = () => {
    if (!detail) return null;

    if (!detail.callHistory.length) {
      return <Alert severity="info">Nenhum histórico de ligações encontrado.</Alert>;
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Autocomplete
            size="small"
            freeSolo
            options={callsResultOptions}
            value={callsResultFilter}
            onInputChange={(_, value) => setCallsResultFilter(value)}
            onChange={(_, value) => setCallsResultFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Resultado" />}
          />
          <TextField
            select
            size="small"
            label="Canal"
            value={callsChannelFilter}
            onChange={(e) => setCallsChannelFilter(e.target.value as "all" | "call" | "whatsapp")}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="call">Ligação</MenuItem>
            <MenuItem value="whatsapp">WhatsApp</MenuItem>
          </TextField>
          <Autocomplete
            size="small"
            freeSolo
            options={callsOperatorOptions}
            value={callsOperatorFilter}
            onInputChange={(_, value) => setCallsOperatorFilter(value)}
            onChange={(_, value) => setCallsOperatorFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Operador" />}
          />
          <TextField size="small" label="Telefone" value={callsPhoneFilter} onChange={(e) => setCallsPhoneFilter(e.target.value)} />
          <TextField size="small" label="Observação" value={callsObservationFilter} onChange={(e) => setCallsObservationFilter(e.target.value)} />
          <TextField size="small" label="Chat/Contato Wpp" value={callsChatFilter} onChange={(e) => setCallsChatFilter(e.target.value)} />
          <TextField select size="small" label="Por página" value={String(callsPerPage)} onChange={(e) => setCallsPerPage(Number(e.target.value))}>
            <MenuItem value="10">10</MenuItem>
            <MenuItem value="20">20</MenuItem>
            <MenuItem value="50">50</MenuItem>
          </TextField>
        </div>

        <Box className="flex justify-end">
          <Tooltip title="Limpar filtros do histórico">
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  setCallsChannelFilter("all");
                  setCallsResultFilter("");
                  setCallsOperatorFilter("");
                  setCallsPhoneFilter("");
                  setCallsObservationFilter("");
                  setCallsChatFilter("");
                  setCallsPerPage(10);
                }}
              >
                <ReplayIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {!filteredCallHistory.length ? (
          <Alert severity="info">Nenhum registro encontrado com os filtros atuais.</Alert>
        ) : null}

        {paginatedCallHistory.map((call: CustomerCallHistoryDetail) => {
          const isWhatsapp = call.CANAL_ATENDIMENTO === "WhatsApp";
          const startedAt = call.WHATSAPP_CHAT_INICIADO_EM ?? call.LIGACAO_RECEBIDA;
          const finishedAt = call.WHATSAPP_CHAT_FINALIZADO_EM ?? call.LIGACAO_FINALIZADA;
          const phone = call.WHATSAPP_CONTATO_FONE ?? call.FONE_RECEPTIVO;
          const title = isWhatsapp ? "Atendimento via WhatsApp" : call.TIPO_ACAO || "Ligação";

          return (
            <Box key={call.CODIGO} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 dark:bg-slate-800">
                <HeadsetMicIcon fontSize="small" className="text-slate-500" />
                <Typography fontWeight={600}>{title}</Typography>
                <Tooltip title={isWhatsapp ? "WhatsApp" : "Ligação"}>
                  <span className="inline-flex items-center">
                    {isWhatsapp ? (
                      <WhatsAppIcon fontSize="small" className="text-green-600" />
                    ) : (
                      <PhoneIcon fontSize="small" className="text-slate-500" />
                    )}
                  </span>
                </Tooltip>
                {(call.RESULTADO_NOME || call.RESULTADO != null) ? (
                  <Chip
                    label={call.RESULTADO_NOME ?? String(call.RESULTADO)}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                ) : null}
              </div>
              <Divider />
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 md:grid-cols-2">
                <Typography variant="body2"><span className="font-medium text-slate-500">Operador:</span> {String(call.OPERADOR ?? "-")}</Typography>
                <Typography variant="body2"><span className="font-medium text-slate-500">Telefone:</span> {phone || "-"}</Typography>
                <Typography variant="body2"><span className="font-medium text-slate-500">Início:</span> {formatDate(startedAt)}</Typography>
                <Typography variant="body2"><span className="font-medium text-slate-500">Fim:</span> {formatDate(finishedAt)}</Typography>
                {isWhatsapp ? (
                  <Typography variant="body2"><span className="font-medium text-slate-500">Contato WhatsApp:</span> {call.WHATSAPP_CONTATO_NOME ?? "-"}</Typography>
                ) : null}
                {isWhatsapp ? (
                  <Typography variant="body2"><span className="font-medium text-slate-500">Chat WhatsApp:</span> #{call.WHATSAPP_CHAT_ID ?? "-"}</Typography>
                ) : null}
                <Typography variant="body2" className="md:col-span-2"><span className="font-medium text-slate-500">Observação:</span> {call.OBS ?? "-"}</Typography>
              </div>
            </Box>
          );
        })}

        {filteredCallHistory.length > 0 ? (
          <Box className="flex flex-col items-center justify-between gap-3 pt-2 md:flex-row">
            <Typography variant="body2" color="text.secondary">
              Exibindo {paginatedCallHistory.length} de {filteredCallHistory.length} registro(s)
            </Typography>
            <Pagination
              page={callsPage}
              count={callPageCount}
              color="primary"
              onChange={(_, page) => setCallsPage(page)}
              showFirstButton
              showLastButton
            />
          </Box>
        ) : null}
      </div>
    );
  };

  const renderPhones = () => {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Área 1"
          value={phonesDraft.AREA1 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, AREA1: Number(e.target.value) || null }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Fone 1"
          value={phonesDraft.FONE1 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, FONE1: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Desc Fone 1"
          value={phonesDraft.DESC_FONE1 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, DESC_FONE1: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />

        <TextField
          label="Área 2"
          value={phonesDraft.AREA2 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, AREA2: Number(e.target.value) || null }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Fone 2"
          value={phonesDraft.FONE2 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, FONE2: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Desc Fone 2"
          value={phonesDraft.DESC_FONE2 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, DESC_FONE2: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />

        <TextField
          label="Área 3"
          value={phonesDraft.AREA3 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, AREA3: Number(e.target.value) || null }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Fone 3"
          value={phonesDraft.FONE3 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, FONE3: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Desc Fone 3"
          value={phonesDraft.DESC_FONE3 ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, DESC_FONE3: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />

        <TextField
          label="Área Fax"
          value={phonesDraft.AREAFAX ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, AREAFAX: Number(e.target.value) || null }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Fax"
          value={phonesDraft.FAX ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, FAX: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />
        <TextField
          label="Desc Fax"
          value={phonesDraft.DESCFAX ?? ""}
          onChange={(e) => setPhonesDraft((prev) => ({ ...prev, DESCFAX: e.target.value }))}
          InputProps={{ readOnly: !canEditPhones }}
        />

        {renderEditActions(
          canEditPhones,
          hasPhonesChanges,
          () => savePatch(phonesDraft, "Telefones atualizados com sucesso."),
          resetPhonesDraft
        )}
      </div>
    );
  };

  const renderPurchases = () => {
    if (!detail) return null;

    if (!detail.purchases.length) {
      return <Alert severity="info">Nenhuma compra encontrada.</Alert>;
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <Autocomplete
            size="small"
            freeSolo
            options={purchaseTypeOptions}
            value={purchaseTypeFilter}
            onInputChange={(_, value) => setPurchaseTypeFilter(value)}
            onChange={(_, value) => setPurchaseTypeFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Tipo" />}
          />
          <Autocomplete
            size="small"
            freeSolo
            options={purchasePaymentOptions}
            value={purchasePaymentFilter}
            onInputChange={(_, value) => setPurchasePaymentFilter(value)}
            onChange={(_, value) => setPurchasePaymentFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Pagamento" />}
          />
          <TextField
            select
            size="small"
            label="Situação"
            value={purchaseSituationFilter}
            onChange={(e) => setPurchaseSituationFilter(e.target.value as "all" | "F" | "C")}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="F">Fechada</MenuItem>
            <MenuItem value="C">Cancelada</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Descrição"
            value={purchaseDescriptionFilter}
            onChange={(e) => setPurchaseDescriptionFilter(e.target.value)}
          />
          <TextField
            select
            size="small"
            label="Itens"
            value={purchaseItemsFilter}
            onChange={(e) => setPurchaseItemsFilter(e.target.value as "all" | "with-items" | "without-items")}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="with-items">Com itens</MenuItem>
            <MenuItem value="without-items">Sem itens</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Por página"
            value={String(purchasePerPage)}
            onChange={(e) => setPurchasePerPage(Number(e.target.value))}
          >
            <MenuItem value="10">10</MenuItem>
            <MenuItem value="20">20</MenuItem>
            <MenuItem value="50">50</MenuItem>
          </TextField>
        </div>

        <Box className="flex justify-end">
          <Tooltip title="Limpar filtros de compras">
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  setPurchaseTypeFilter("");
                  setPurchasePaymentFilter("");
                  setPurchaseSituationFilter("all");
                  setPurchaseDescriptionFilter("");
                  setPurchaseItemsFilter("all");
                  setPurchasePerPage(10);
                }}
              >
                <ReplayIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {!filteredPurchases.length ? (
          <Alert severity="info">Nenhuma compra encontrada com os filtros atuais.</Alert>
        ) : null}

        {!detail.metadata.purchaseItems.mapped && (
          <Alert severity="warning">
            Itens de compra ainda não mapeados automaticamente no CRM desta instância.
          </Alert>
        )}

        {paginatedPurchases.map((purchase: CustomerPurchaseDetail) => (
          <Box key={purchase.CODIGO} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <ReceiptLongIcon fontSize="small" className="text-slate-500" />
                <Typography fontWeight={700}>Compra #{purchase.CODIGO}</Typography>
                {purchase.TIPO ? <Chip label={purchase.TIPO} size="small" variant="outlined" /> : null}
              </div>
              <Typography fontWeight={600} color="success.main">{formatCurrency(purchase.VALOR)}</Typography>
            </div>
            <Divider />
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 md:grid-cols-2">
              <Typography variant="body2"><span className="font-medium text-slate-500">Data:</span> {formatDate(purchase.DATA)}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Pagamento:</span> {purchase.FORMA_PGTO ?? "-"}</Typography>
              <Typography variant="body2" className="md:col-span-2"><span className="font-medium text-slate-500">Descrição:</span> {purchase.DESCRICAO ?? "-"}</Typography>
            </div>

            {purchase.items.length > 0 ? (
              <>
                <Divider />
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchase.items.map((item, index) => (
                    <div key={`${purchase.CODIGO}-${index}`} className="grid grid-cols-2 gap-x-4 px-3 py-1.5 text-sm md:grid-cols-4">
                      <span><span className="text-slate-500">Produto:</span> {item.productCode ?? "-"}</span>
                      <span className="md:col-span-2 truncate">{item.description ?? "-"}</span>
                      <span className="text-right">{String(item.quantity ?? "-")} {item.unit ?? ""} × {formatCurrency(item.unitValue)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Typography variant="body2" className="px-3 py-2 text-slate-400">
                Sem itens para esta compra.
              </Typography>
            )}
          </Box>
        ))}

        {filteredPurchases.length > 0 ? (
          <Box className="flex flex-col items-center justify-between gap-3 pt-2 md:flex-row">
            <Typography variant="body2" color="text.secondary">
              Exibindo {paginatedPurchases.length} de {filteredPurchases.length} compra(s)
            </Typography>
            <Pagination
              page={purchasePage}
              count={purchasePageCount}
              color="primary"
              onChange={(_, page) => setPurchasePage(page)}
              showFirstButton
              showLastButton
            />
          </Box>
        ) : null}
      </div>
    );
  };

  const renderAgenda = () => {
    if (!detail) return null;

    if (!detail.schedules.length) {
      return <Alert severity="info">Nenhum registro de agenda encontrado.</Alert>;
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <Autocomplete
            size="small"
            freeSolo
            options={agendaCampaignOptions}
            value={agendaCampaignFilter}
            onInputChange={(_, value) => setAgendaCampaignFilter(value)}
            onChange={(_, value) => setAgendaCampaignFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Campanha" />}
          />
          <Autocomplete
            size="small"
            freeSolo
            options={agendaOperatorOptions}
            value={agendaOperatorFilter}
            onInputChange={(_, value) => setAgendaOperatorFilter(value)}
            onChange={(_, value) => setAgendaOperatorFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Operador" />}
          />
          <Autocomplete
            size="small"
            freeSolo
            options={agendaLinkedOperatorOptions}
            value={agendaLinkedOperatorFilter}
            onInputChange={(_, value) => setAgendaLinkedOperatorFilter(value)}
            onChange={(_, value) => setAgendaLinkedOperatorFilter(value ?? "")}
            renderInput={(params) => <TextField {...params} label="Operador lig." />}
          />
          <TextField
            size="small"
            label="Telefone"
            value={agendaPhoneFilter}
            onChange={(e) => setAgendaPhoneFilter(e.target.value)}
          />
          <TextField
            select
            size="small"
            label="Concluído"
            value={agendaConcludedFilter}
            onChange={(e) => setAgendaConcludedFilter(e.target.value as "all" | "SIM" | "NAO")}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="SIM">Sim</MenuItem>
            <MenuItem value="NAO">Não</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Por página"
            value={String(agendaPerPage)}
            onChange={(e) => setAgendaPerPage(Number(e.target.value))}
          >
            <MenuItem value="10">10</MenuItem>
            <MenuItem value="20">20</MenuItem>
            <MenuItem value="50">50</MenuItem>
          </TextField>
        </div>

        <Box className="flex justify-end">
          <Tooltip title="Limpar filtros da agenda">
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  setAgendaCampaignFilter("");
                  setAgendaOperatorFilter("");
                  setAgendaLinkedOperatorFilter("");
                  setAgendaPhoneFilter("");
                  setAgendaConcludedFilter("all");
                  setAgendaPerPage(10);
                }}
              >
                <ReplayIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {!filteredAgenda.length ? (
          <Alert severity="info">Nenhum registro de agenda encontrado com os filtros atuais.</Alert>
        ) : null}

        {paginatedAgenda.map((schedule: CustomerScheduleDetail) => (
          <Box key={schedule.CODIGO} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 dark:bg-slate-800">
              <CalendarMonthIcon fontSize="small" className="text-slate-500" />
              <Typography fontWeight={600}>{formatDate(schedule.DT_AGENDAMENTO)}</Typography>
              {schedule.RESULTADO ? <Chip label={String(schedule.RESULTADO)} size="small" variant="outlined" /> : null}
            </div>
            <Divider />
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 md:grid-cols-2">
              <Typography variant="body2"><span className="font-medium text-slate-500">Campanha:</span> {schedule.CAMPANHA_NOME ?? String(schedule.CAMPANHA ?? "-")}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Data resultado:</span> {formatDate(schedule.DT_RESULTADO)}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Operador:</span> {schedule.OPERADOR_NOME ?? String(schedule.OPERADOR ?? "-")}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Operador lig.:</span> {schedule.OPERADOR_LIGACAO_NOME ?? String(schedule.OPERADOR_LIGACAO ?? "-")}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Fones:</span> {[schedule.FONE1, schedule.FONE2, schedule.FONE3].filter(Boolean).join(" / ") || "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Fone ligado:</span> {schedule.TELEFONE_LIGADO ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Lig. início:</span> {formatDate(schedule.DATA_HORA_LIG)}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Lig. fim:</span> {formatDate(schedule.DATA_HORA_FIM)}</Typography>
            </div>
          </Box>
        ))}

        {filteredAgenda.length > 0 ? (
          <Box className="flex flex-col items-center justify-between gap-3 pt-2 md:flex-row">
            <Typography variant="body2" color="text.secondary">
              Exibindo {paginatedAgenda.length} de {filteredAgenda.length} registro(s)
            </Typography>
            <Pagination
              page={agendaPage}
              count={agendaPageCount}
              color="primary"
              onChange={(_, page) => setAgendaPage(page)}
              showFirstButton
              showLastButton
            />
          </Box>
        ) : null}
      </div>
    );
  };

  const renderCurrentTab = () => {
    switch (tab) {
      case "main":
        return renderMain();
      case "address":
        return renderAddress();
      case "origin":
        return renderOrigin();
      case "contacts":
        return renderContacts();
      case "observations":
        return renderObservations();
      case "calls":
        return renderCalls();
      case "phones":
        return renderPhones();
      case "purchases":
        return renderPurchases();
      case "agenda":
        return renderAgenda();
      default:
        return null;
    }
  };

  return (
    <aside className="mx-2 my-4 flex h-[90vh] w-[95vw] max-w-6xl flex-col rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
      <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
        <div>
          <Typography variant="h6" fontWeight={700}>
            Detalhes do cliente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Código: {customerId}
          </Typography>
        </div>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <CircularProgress />
        </div>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            className="mb-3"
          >
            <Tab value="main" label="Cliente" icon={<PersonIcon fontSize="small" />} iconPosition="start" />
            <Tab value="address" label="Endereço" icon={<HomeIcon fontSize="small" />} iconPosition="start" />
            <Tab value="origin" label="Origem" icon={<TravelExploreIcon fontSize="small" />} iconPosition="start" />
            <Tab value="contacts" label="Contatos" icon={<ContactsIcon fontSize="small" />} iconPosition="start" />
            <Tab value="observations" label="Observações" icon={<NoteAltIcon fontSize="small" />} iconPosition="start" />
            <Tab value="calls" label="Histórico" icon={<HeadsetMicIcon fontSize="small" />} iconPosition="start" />
            <Tab value="phones" label="Telefones" icon={<PhoneIcon fontSize="small" />} iconPosition="start" />
            <Tab value="purchases" label="Compras" icon={<ReceiptLongIcon fontSize="small" />} iconPosition="start" />
            <Tab value="agenda" label="Agenda" icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" />
          </Tabs>

          <div className="scrollbar-whatsapp min-h-0 flex-1 overflow-y-auto">
            <div className="px-1 py-3">{renderCurrentTab()}</div>
          </div>
        </>
      )}
    </aside>
  );
}
