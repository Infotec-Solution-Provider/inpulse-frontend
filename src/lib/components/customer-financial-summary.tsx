import { Alert } from "@mui/material";

export interface FinancialAccess { canViewFinancial: boolean; canViewPurchases: boolean }
export function financialSummaryRows(customer: Record<string, unknown>) {
  const money = (value: unknown) => value == null || value === "" ? "Não informado" : Number.isFinite(Number(value)) ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";
  const date = (value: unknown) => {
    const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "Não informado";
  };
  return [
    ["Saldo disponível", money(customer.SALDO_DISPONIVEL)],
    ["Limite de crédito", money(customer.SALDO_LIMITE)],
    ["Potencial", money(customer.POTENCIAL)],
    ["Última compra", date(customer.DATA_ULT_COMPRA)],
    ["Vencimento do limite", date(customer.VENCIMENTO_LIMITE_CREDITO)],
  ];
}
export default function CustomerFinancialSummary({ customer, access }: { customer: object; access?: FinancialAccess }) {
  if (!access?.canViewFinancial) return <Alert severity="info">Seu perfil não permite visualizar a ficha financeira deste cliente.</Alert>;
  return <section aria-label="Ficha financeira" className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
    <h3 className="mb-3 font-semibold">Ficha financeira</h3>
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{financialSummaryRows(customer as Record<string, unknown>).map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Consulta de valores do CRM. A atualização é feita por importação.</p>
  </section>;
}
