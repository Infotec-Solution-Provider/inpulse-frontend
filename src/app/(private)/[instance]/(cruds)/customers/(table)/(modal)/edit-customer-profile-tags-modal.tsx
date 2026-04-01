"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import {
  CustomerProfileSummaryLevel,
  CustomerProfileSummaryPayload,
  CustomerPurchaseInterestLevel,
} from "@/lib/types/customer-profile-summary";
import { Customer } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Button,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { toast } from "react-toastify";

interface EditCustomerProfileTagsModalProps {
  customer: Customer;
  profileSummary: CustomerProfileSummaryPayload | null;
  onSaved: (summary: CustomerProfileSummaryPayload) => void;
}

type SelectableProfileLevel = CustomerProfileSummaryLevel | "automatic";
type SelectablePurchaseInterestLevel = CustomerPurchaseInterestLevel | "automatic";

const PROFILE_LEVEL_OPTIONS: Array<{ value: SelectableProfileLevel; label: string }> = [
  { value: "automatic", label: "Automático" },
  { value: "potencial_de_compra", label: "Potencial de compra" },
  { value: "consolidado", label: "Consolidado" },
  { value: "precisa_mais_interacao", label: "Precisa mais interação" },
  { value: "em_observacao", label: "Em observação" },
];

const PURCHASE_INTEREST_OPTIONS: Array<{ value: SelectablePurchaseInterestLevel; label: string }> = [
  { value: "automatic", label: "Automático" },
  { value: "nao_analisado", label: "Não analisado por IA" },
  { value: "baixo_interesse", label: "Baixo interesse" },
  { value: "interesse_moderado", label: "Interesse moderado" },
  { value: "alto_interesse", label: "Alto interesse" },
  { value: "pronto_para_compra", label: "Pronto para compra" },
];

export default function EditCustomerProfileTagsModal({
  customer,
  profileSummary,
  onSaved,
}: EditCustomerProfileTagsModalProps) {
  const { closeModal } = useAppContext();
  const { wppApi } = useContext(WhatsappContext);
  const [saving, setSaving] = useState(false);
  const [profileLevel, setProfileLevel] = useState<SelectableProfileLevel>(
    profileSummary?.manualOverrides?.profileLevel ?? "automatic",
  );
  const [purchaseInterestLevel, setPurchaseInterestLevel] = useState<SelectablePurchaseInterestLevel>(
    profileSummary?.manualOverrides?.purchaseInterestLevel ?? "automatic",
  );

  const manualOverrideDescription = useMemo(() => {
    if (!profileSummary?.manualOverrides) {
      return null;
    }

    return `Última edição manual por ${profileSummary.manualOverrides.updatedByName} em ${new Date(
      profileSummary.manualOverrides.updatedAt,
    ).toLocaleString("pt-BR")}`;
  }, [profileSummary]);

  const handleSave = async () => {
    if (!wppApi.current) {
      toast.error("Serviço do WhatsApp indisponível.");
      return;
    }

    setSaving(true);

    try {
      const response = await wppApi.current.ax.put<{ message: string; data: CustomerProfileSummaryPayload }>(
        `/api/whatsapp/customers/${customer.CODIGO}/profile-tags/manual-overrides`,
        {
          profileLevel: profileLevel === "automatic" ? null : profileLevel,
          purchaseInterestLevel: purchaseInterestLevel === "automatic" ? null : purchaseInterestLevel,
        },
      );

      onSaved(response.data.data);
      toast.success("Tags manuais atualizadas com sucesso!");
      closeModal();
    } catch (error) {
      toast.error("Não foi possível atualizar as tags manuais.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="flex h-full w-full max-w-2xl flex-col gap-6 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
      <header className="flex w-full items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Editar Tags Manuais</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">{customer.RAZAO}</p>
        </div>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info">
        Use “Automático” para deixar o sistema decidir. Se escolher um valor manual, ele passa a prevalecer sobre a regra automática.
      </Alert>

      {manualOverrideDescription ? <Alert severity="success">{manualOverrideDescription}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          select
          label="Tag de perfil"
          value={profileLevel}
          onChange={(event) => setProfileLevel(event.target.value as SelectableProfileLevel)}
        >
          {PROFILE_LEVEL_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Interesse de compra"
          value={purchaseInterestLevel}
          onChange={(event) => setPurchaseInterestLevel(event.target.value as SelectablePurchaseInterestLevel)}
        >
          {PURCHASE_INTEREST_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </div>

      {profileSummary ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40 md:grid-cols-2">
          <div>
            <span className="font-semibold">Perfil atual:</span> {profileSummary.label}
          </div>
          <div>
            <span className="font-semibold">Interesse atual:</span> {profileSummary.purchaseInterest.label}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <Button variant="outlined" onClick={closeModal} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </aside>
  );
}
