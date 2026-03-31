"use client";

import customersService from "@/lib/services/customers.service";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import { Customer } from "@in.pulse-crm/sdk";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import ContactsIcon from "@mui/icons-material/Contacts";
import DoneIcon from "@mui/icons-material/Done";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import HomeIcon from "@mui/icons-material/Home";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplayIcon from "@mui/icons-material/Replay";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
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
        <TextField label="Email" value={detail.customer.EMAIL ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Email 2" value={detail.customer.EMAIL2 ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Website" value={detail.customer.WEBSITE ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Contato E-mail" value={detail.customer.CONTATO_MAIL ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Operador" value={detail.operator.name ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Segmento" value={detail.segment.name ?? "-"} InputProps={{ readOnly: true }} />
        <TextField label="Funcionários" value={detail.customer.NR_FUNCIONARIOS ?? "-"} InputProps={{ readOnly: true }} />
        <TextField
          label="Nome customizável"
          value={detail.metadata.customNameFieldMapped ? "Mapeado" : "Não mapeado no CRM"}
          InputProps={{ readOnly: true }}
        />
      </div>
    );
  };

  const renderContacts = () => {
    if (!detail) return null;

    if (!detail.contacts.length) {
      return <Alert severity="info">Nenhum contato encontrado para este cliente.</Alert>;
    }

    return (
      <div className="space-y-3">
        {detail.contacts.map((contact) => (
          <Box key={contact.CODIGO} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 dark:bg-slate-800">
              <ContactsIcon fontSize="small" className="text-slate-500" />
              <Typography fontWeight={700}>{contact.NOME}</Typography>
              {contact.CARGO ? <Chip label={String(contact.CARGO)} size="small" variant="outlined" /> : null}
            </div>
            <Divider />
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 md:grid-cols-2">
              <Typography variant="body2"><span className="font-medium text-slate-500">Tratamento:</span> {contact.TRATAMENTO ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Email:</span> {contact.EMAIL ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Fone direto:</span> ({contact.AREA_DIRETO ?? "-"}) {contact.FONE_DIRETO ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Celular:</span> ({contact.AREA_CEL ?? "-"}) {contact.CELULAR ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Residencial:</span> ({contact.AREA_RESI ?? "-"}) {contact.FONE_RESIDENCIAL ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Aniversário:</span> {formatDate(contact.ANIVERSARIO)}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Sexo:</span> {contact.SEXO ?? "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Filhos:</span> {String(contact.FILHOS ?? 0)}</Typography>
            </div>
          </Box>
        ))}
        {/* <Alert severity="warning">Edição de contatos será concluída no próximo incremento.</Alert> */}
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
        {detail.callHistory.map((call: CustomerCallHistoryDetail) => (
          <Box key={call.CODIGO} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 dark:bg-slate-800">
              <HeadsetMicIcon fontSize="small" className="text-slate-500" />
              <Typography fontWeight={600}>{call.TIPO_ACAO || "Ligação"}</Typography>
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
              <Typography variant="body2"><span className="font-medium text-slate-500">Telefone:</span> {call.FONE_RECEPTIVO || "-"}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Início:</span> {formatDate(call.LIGACAO_RECEBIDA)}</Typography>
              <Typography variant="body2"><span className="font-medium text-slate-500">Fim:</span> {formatDate(call.LIGACAO_FINALIZADA)}</Typography>
            </div>
          </Box>
        ))}
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
        {!detail.metadata.purchaseItems.mapped && (
          <Alert severity="warning">
            Itens de compra ainda não mapeados automaticamente no CRM desta instância.
          </Alert>
        )}

        {detail.purchases.map((purchase: CustomerPurchaseDetail) => (
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
        {detail.schedules.map((schedule: CustomerScheduleDetail) => (
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
            variant="standard"
            scrollButtons="auto"
            className="mb-3"
          >
            <Tab value="main" label="Cliente" icon={<PersonIcon fontSize="small" />} iconPosition="start" />
            <Tab value="address" label="Endereço" icon={<HomeIcon fontSize="small" />} iconPosition="start" />
            <Tab value="origin" label="Origem" icon={<TravelExploreIcon fontSize="small" />} iconPosition="start" />
            <Tab value="contacts" label="Contatos" icon={<ContactsIcon fontSize="small" />} iconPosition="start" />
            <Tab value="observations" label="Observações" icon={<NoteAltIcon fontSize="small" />} iconPosition="start" />
            <Tab value="calls" label="Ligações" icon={<HeadsetMicIcon fontSize="small" />} iconPosition="start" />
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
