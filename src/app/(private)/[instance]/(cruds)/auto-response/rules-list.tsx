"use client";
import { Button, CircularProgress } from "@mui/material";
import { Plus } from "lucide-react";
import { CrmPage, CrmFilters, useCrmQueryState } from "@/lib/ui-system";
import { useAutoResponseContext } from "./auto-response.context";
import RuleCard from "./rule-card";
export default function RulesList() {
  const { rules, isLoading, openRuleModal, loadRules } = useAutoResponseContext();
  const [filters, setFilters] = useCrmQueryState<Record<string, string>>("auto-response-list", {});
  const rows = rules.filter(
    (rule) =>
      (!filters.name || rule.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase())) &&
      (!filters.status || String(rule.isEnabled) === filters.status),
  );
  return (
    <CrmPage
      title="Resposta automática"
      description="Organize as regras, o público e os horários de resposta."
      count={isLoading ? undefined : rows.length}
      breadcrumbs={[{ label: "Comunicação" }, { label: "Resposta automática" }]}
      actions={
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => openRuleModal()}>
          Nova regra
        </Button>
      }
    >
      <CrmFilters
        values={filters}
        onApply={setFilters}
        onRefresh={loadRules}
        loading={isLoading}
        fields={[
          { key: "name", label: "Nome" },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "true", label: "Ativa" },
              { value: "false", label: "Inativa" },
            ],
          },
        ]}
      />
      {isLoading ? (
        <div className="ip-crud-state">
          <CircularProgress size={24} />
          <span>Carregando regras...</span>
        </div>
      ) : rows.length ? (
        <div
          className="ip-crud-record-list"
          role="region"
          aria-label="Lista de regras de resposta automática"
        >
          {rows.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      ) : (
        <div className="ip-crud-record ip-crud-state">Nenhuma regra encontrada.</div>
      )}
    </CrmPage>
  );
}
