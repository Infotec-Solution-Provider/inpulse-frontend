"use client";

import { CrmPage } from "@/lib/ui-system";
import { useAuthContext } from "@/app/auth-context";
import {
  ASSISTANT_MODEL_CATALOG,
  getOffCatalogModels,
  isWholeCatalogSelected,
} from "@/lib/ai-model-catalog";
import aiService from "@/lib/services/ai.service";
import usersService from "@/lib/services/users.service";
import type {
  AiOpenAiKeyStatus,
  AiTenantConfig,
  AiUsageSummary,
} from "@/lib/types/sdk-local.types";
import { User, UserRole } from "@/lib/sdk-local";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { AutoAwesome as AutoAwesomeIcon } from "@/lib/ui-system/crm-icons";
import { Key as KeyIcon } from "@/lib/ui-system/crm-icons";
import { ModelTraining as ModelTrainingIcon } from "@/lib/ui-system/crm-icons";
import { QueryStats as QueryStatsIcon } from "@/lib/ui-system/crm-icons";
import { SavingsOutlined as SavingsOutlinedIcon } from "@/lib/ui-system/crm-icons";
import { Tune as TuneIcon } from "@/lib/ui-system/crm-icons";
import { Alert, Button, CircularProgress, Skeleton } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { SettingsSections } from "@/lib/ui-system/settings-sections";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { toast } from "react-toastify";
import BudgetPanel from "./budget-panel";
import FeatureModelsPanel from "./feature-models-panel";
import ModelsPanel, { ModelsPanelActions } from "./models-panel";
import OpenAiKeyPanel from "./openai-key-panel";
import { SectionCard } from "./presentation";
import {
  formFromConfig,
  formKey,
  parsePositiveUsd,
  validateForm,
  type AiSettingsForm,
} from "./settings-form";
import UsagePanel, { UsagePanelActions, type UsagePeriod, type UsageView } from "./usage-panel";

/** Consumo do período; `period` null não carrega nada. */
function useUsageSummary(
  period: UsagePeriod | null,
  token: string | null | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<{
    data: AiUsageSummary | null;
    loading: boolean;
    failed: boolean;
  }>({
    data: null,
    loading: false,
    failed: false,
  });

  useEffect(() => {
    if (!enabled || period === null || typeof token !== "string") return;
    let cancelled = false;
    setState((current) => ({ data: current.data, loading: true, failed: false }));
    aiService
      .getUsageSummary(period, token)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, failed: false });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ data: null, loading: false, failed: true });
        toast.error(`Falha ao carregar o consumo: ${sanitizeErrorMessage(error)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [period, token, enabled]);

  return state;
}

function PageShell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <CrmPage
      title="Configurações de IA"
      description="Gerencie a chave, os modelos e os limites de uso da empresa."
      breadcrumbs={[{ label: "IA" }, { label: "Configurações" }]}
      actions={header}
    >
      {children}
    </CrmPage>
  );
}

export default function AiSettingsPage() {
  const { user, instance } = useAuthContext();
  return <AiSettings key={`${instance}:${user?.CODIGO}`} />;
}

function AiSettings() {
  const [section, setSection] = useState("access");
  const { token, user, instance } = useAuthContext();
  const authenticated = typeof token === "string";
  const isAdmin = String(user?.NIVEL ?? "") === UserRole.ADMIN;

  const [config, setConfig] = useState<AiTenantConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [openaiKey, setOpenaiKey] = useState<AiOpenAiKeyStatus | null>(null);
  const [form, setForm] = useState<AiSettingsForm | null>(null);
  const [savedForm, setSavedForm] = useState<AiSettingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [operators, setOperators] = useState<User[]>([]);

  const [period, setPeriod] = useState<UsagePeriod>("current_month");
  const [usageView, setUsageView] = useState<UsageView>("feature");
  const monthUsage = useUsageSummary("current_month", token, isAdmin);
  const periodUsage = useUsageSummary(period === "current_month" ? null : period, token, isAdmin);
  const usage = period === "current_month" ? monthUsage : periodUsage;

  useEffect(() => {
    if (!isAdmin || typeof token !== "string" || !instance) return;
    let cancelled = false;

    setLoadingConfig(true);
    aiService
      .getTenantConfig(instance, token)
      .then((loaded) => {
        if (cancelled) return;
        const initial = formFromConfig(loaded);
        setConfig(loaded);
        setOpenaiKey(
          loaded.openaiKey && "storageAvailable" in loaded.openaiKey ? loaded.openaiKey : null,
        );
        setForm(initial);
        setSavedForm(initial);
      })
      .catch((error) => {
        if (!cancelled)
          toast.error(`Falha ao carregar as configurações: ${sanitizeErrorMessage(error)}`);
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, authenticated, instance]);

  useEffect(() => {
    if (!isAdmin || typeof token !== "string") return;
    usersService
      .getUsers({ perPage: "500" })
      .then(({ data }) => setOperators(data))
      .catch(() => setOperators([]));
  }, [isAdmin, authenticated]);

  const dirty = useMemo(
    () => form !== null && savedForm !== null && formKey(form) !== formKey(savedForm),
    [form, savedForm],
  );

  useCrmLeaveGuard(dirty, saving);

  const operatorMonthCosts = useMemo(() => {
    if (!monthUsage.data) return null;
    return new Map(monthUsage.data.byOperator.map((row) => [row.operatorId, row.estimatedCostUsd]));
  }, [monthUsage.data]);

  const operatorLimits = useMemo(() => {
    const limits: Record<string, number> = {};
    for (const [id, raw] of Object.entries(form?.operatorBudgets ?? {})) {
      const value = parsePositiveUsd(raw);
      if (value !== null) limits[id] = value;
    }
    return limits;
  }, [form?.operatorBudgets]);

  function update(patch: Partial<AiSettingsForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setInvalidField(null);
  }

  function operatorName(operatorId: number): string {
    const operator = operators.find((entry) => entry.CODIGO === operatorId);
    return operator ? operator.NOME : `Operador #${operatorId}`;
  }

  async function handleSave() {
    if (!form || typeof token !== "string" || !instance || saving) return;

    const result = validateForm(form);
    if (!result.ok) {
      setInvalidField(result.field);
      setSection(
        result.field === "budget" || result.field.startsWith("operator:") ? "limits" : "models",
      );
      toast.error(result.error);
      return;
    }

    try {
      setSaving(true);
      const updated = await aiService.upsertTenantConfig(instance, result.payload, token);
      const next = formFromConfig(updated);
      setConfig(updated);
      setForm(next);
      setSavedForm(next);
      toast.success("Configurações de IA salvas.");
    } catch (error) {
      toast.error(`Falha ao salvar: ${sanitizeErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm("Descartar alterações das configurações de IA?")) return;
    setForm(savedForm);
    setInvalidField(null);
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <Alert severity="warning">Acesso restrito a administradores.</Alert>
      </PageShell>
    );
  }

  const header = (
    <div className="ip-crud-actions">
      {dirty && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
          Alterações não salvas
        </span>
      )}
      <Button variant="text" onClick={handleDiscard} disabled={!dirty || saving}>
        Descartar
      </Button>
      <Button
        variant="contained"
        onClick={() => void handleSave()}
        disabled={!dirty || saving}
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        disableElevation
      >
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );

  if (loadingConfig || !form) {
    return (
      <PageShell header={header}>
        {loadingConfig ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton variant="rounded" height={200} />
              <Skeleton variant="rounded" height={200} />
            </div>
            <Skeleton variant="rounded" height={420} />
            <Skeleton variant="rounded" height={160} />
          </>
        ) : (
          <Alert severity="error">
            Não foi possível carregar as configurações de IA. Recarregue a página.
          </Alert>
        )}
      </PageShell>
    );
  }

  const offCatalog = getOffCatalogModels(
    [...(config?.availableModels ?? []), ...form.selectedModels],
    ASSISTANT_MODEL_CATALOG,
  );
  const unrestricted =
    form.selectedModels.length === 0 ||
    isWholeCatalogSelected(form.selectedModels, ASSISTANT_MODEL_CATALOG);
  const releasedCount = form.selectedModels.filter((value) =>
    ASSISTANT_MODEL_CATALOG.some((model) => model.value === value),
  ).length;

  return (
    <PageShell header={header}>
      <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
        <SettingsSections
          label="Seções das configurações de IA"
          value={section}
          onChange={setSection}
          sections={[
            {
              id: "access",
              label: "Conexão",
              content: (
                <>
                  <SectionCard
                    icon={<KeyIcon fontSize="small" />}
                    title="Chave da OpenAI"
                    description="A IA desta empresa usa a conta da empresa na OpenAI. A chave é salva na hora, separada das demais configurações."
                  >
                    {typeof token === "string" && instance ? (
                      <OpenAiKeyPanel
                        instance={instance}
                        token={token}
                        status={openaiKey}
                        onChange={setOpenaiKey}
                      />
                    ) : null}
                  </SectionCard>
                </>
              ),
            },
            {
              id: "models",
              label: "Modelos",
              content: (
                <>
                  <SectionCard
                    icon={<ModelTrainingIcon fontSize="small" />}
                    title="Modelos"
                    description={
                      <>
                        Marque os modelos que os operadores podem escolher no Assistente IA
                        {" · "}
                        <span className="font-medium text-[var(--ip-text)]">
                          {unrestricted
                            ? "todos liberados"
                            : `${releasedCount} de ${ASSISTANT_MODEL_CATALOG.length} liberados`}
                        </span>
                        . Preços em US$ por 1 milhão de tokens, conforme a tabela da OpenAI de
                        07/10/2026.
                      </>
                    }
                    actions={
                      <ModelsPanelActions
                        selected={form.selectedModels}
                        onChange={(selectedModels) => update({ selectedModels })}
                      />
                    }
                  >
                    <ModelsPanel
                      selected={form.selectedModels}
                      offCatalog={offCatalog}
                      defaultModel={form.defaultModel}
                      onChange={(selectedModels) => update({ selectedModels })}
                    />
                  </SectionCard>
                  <SectionCard
                    icon={<TuneIcon fontSize="small" />}
                    title="Modelo por funcionalidade"
                    description="O modelo padrão vale para tudo; troque só onde precisar de mais qualidade ou de menos custo."
                  >
                    <FeatureModelsPanel
                      defaultModel={form.defaultModel}
                      featureModels={form.featureModels}
                      onDefaultModelChange={(defaultModel) => update({ defaultModel })}
                      onFeatureModelChange={(feature, value) => {
                        const next = { ...form.featureModels };
                        if (value) next[feature] = value;
                        else delete next[feature];
                        update({ featureModels: next });
                      }}
                    />
                  </SectionCard>
                </>
              ),
            },
            {
              id: "limits",
              label: "Limites de gasto",
              content: (
                <>
                  <SectionCard
                    icon={<SavingsOutlinedIcon fontSize="small" />}
                    title="Limites de gasto"
                    description="Limites mensais em US$. Ao atingir um limite, o copiloto e o Assistente IA ficam bloqueados até o mês seguinte."
                  >
                    <BudgetPanel
                      budget={form.budget}
                      budgetError={invalidField === "budget"}
                      onBudgetChange={(budget) => update({ budget })}
                      monthCost={
                        monthUsage.data
                          ? monthUsage.data.estimatedCostUsd
                          : monthUsage.failed
                            ? undefined
                            : null
                      }
                      operatorMonthCosts={operatorMonthCosts}
                      operatorBudgets={form.operatorBudgets}
                      invalidOperatorId={
                        invalidField?.startsWith("operator:")
                          ? invalidField.slice("operator:".length)
                          : null
                      }
                      operators={operators}
                      onOperatorBudgetChange={(id, value) =>
                        update({ operatorBudgets: { ...form.operatorBudgets, [id]: value } })
                      }
                      onRemoveOperator={(id) => {
                        const next = { ...form.operatorBudgets };
                        delete next[id];
                        update({ operatorBudgets: next });
                      }}
                    />
                  </SectionCard>
                </>
              ),
            },
            {
              id: "usage",
              label: "Consumo",
              content: (
                <>
                  <SectionCard
                    icon={<QueryStatsIcon fontSize="small" />}
                    title="Consumo"
                    description="Tokens e custo estimado por funcionalidade e por operador."
                    actions={
                      <UsagePanelActions
                        view={usageView}
                        period={period}
                        onViewChange={setUsageView}
                        onPeriodChange={setPeriod}
                      />
                    }
                  >
                    <UsagePanel
                      usage={usage.data}
                      loading={usage.loading}
                      view={usageView}
                      operatorName={operatorName}
                      operatorLimits={operatorLimits}
                    />
                  </SectionCard>
                </>
              ),
            },
          ]}
        />
      </fieldset>
    </PageShell>
  );
}
