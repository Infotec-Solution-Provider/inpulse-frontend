"use client";

import { MenuItem, TextField } from "@mui/material";

export const CUSTOMER_FILTER_LABELS: Record<string, string> = {
  CODIGO: "Código do cliente",
  RAZAO: "Nome do cliente",
  CPF_CNPJ: "CPF/CNPJ",
  COD_ERP: "Código ERP",
  CIDADE: "Cidade",
  ATIVO: "Situação",
  PESSOA: "Tipo de pessoa",
  purchaseStatus: "Compras",
  purchaseFrom: "Compra desde",
  purchaseTo: "Compra até",
  campaignIds: "Campanhas",
  segmentIds: "Segmentos",
  registeredFrom: "Cadastro desde",
  registeredTo: "Cadastro até",
  loyaltyOperatorIds: "Usuários fidelizados",
  groupIds: "Grupos de clientes",
  originIds: "Origens",
  mediaIds: "Mídias CRM",
  unitIds: "Unidades",
  brandIds: "Marcas",
  positionIds: "Cargos dos contatos",
  states: "Estados",
  phone: "Telefone do cliente",
  email: "E-mail",
};

export default function CustomerBasicFilters({
  filters,
  onChange,
  showName = true,
}: {
  filters: Record<string, string | undefined>;
  onChange: (filters: Record<string, string | undefined>) => void;
  showName?: boolean;
}) {
  const update = (key: string, value: string) => onChange({ ...filters, [key]: value });
  return (
    <div className="ip-crud-grid">
      {(showName
        ? ["RAZAO", "CODIGO", "CPF_CNPJ", "COD_ERP", "CIDADE"]
        : ["CODIGO", "CPF_CNPJ", "COD_ERP", "CIDADE"]
      ).map((key) => (
        <TextField
          key={key}
          size="small"
          label={CUSTOMER_FILTER_LABELS[key]}
          value={filters[key] ?? ""}
          onChange={(event) =>
            update(
              key,
              key === "CPF_CNPJ" ? event.target.value.replace(/\D/g, "") : event.target.value,
            )
          }
        />
      ))}
      <TextField
        select
        size="small"
        label="Situação"
        value={filters.ATIVO ?? ""}
        onChange={(event) => update("ATIVO", event.target.value)}
      >
        <MenuItem value="">Todas</MenuItem>
        <MenuItem value="SIM">Ativos</MenuItem>
        <MenuItem value="NAO">Inativos</MenuItem>
      </TextField>
      <TextField
        select
        size="small"
        label="Tipo de pessoa"
        value={filters.PESSOA ?? ""}
        onChange={(event) => update("PESSOA", event.target.value)}
      >
        <MenuItem value="">Todas</MenuItem>
        <MenuItem value="FIS">Física</MenuItem>
        <MenuItem value="JUR">Jurídica</MenuItem>
      </TextField>
    </div>
  );
}
