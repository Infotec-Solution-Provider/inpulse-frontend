import { describe, expect, it } from "vitest";
import { ASSISTANT_MODEL_CATALOG } from "@/lib/ai-model-catalog";
import type { AiTenantConfig } from "@/lib/types/sdk-local.types";
import { formFromConfig, formKey, parsePositiveUsd, validateForm } from "./settings-form";

const assistantValues = ASSISTANT_MODEL_CATALOG.map((model) => model.value);

function config(overrides: Partial<AiTenantConfig> = {}): AiTenantConfig {
  return {
    instance: "teste",
    model: "gpt-5.4",
    temperature: 0.7,
    maxTokens: 4000,
    enabled: true,
    monthlyBudgetUsd: null,
    availableModels: null,
    featureModels: null,
    operatorBudgets: null,
    ...overrides,
  };
}

describe("formFromConfig", () => {
  it("marks every Assistant model when the company has no restriction", () => {
    const form = formFromConfig(config());

    expect(form.selectedModels).toEqual(assistantValues);
    expect(form.selectedModels).not.toContain("gpt-6-astra");
    expect(form.budget).toBe("");
    expect(form.defaultModel).toBe("gpt-5.4");
  });

  it("keeps the saved values as text for the fields", () => {
    const form = formFromConfig(
      config({
        monthlyBudgetUsd: 25.5,
        availableModels: ["gpt-6-luna"],
        featureModels: { summarize_chat: "gpt-6-astra" },
        operatorBudgets: { "7": 3 },
      }),
    );

    expect(form.budget).toBe("25.5");
    expect(form.selectedModels).toEqual(["gpt-6-luna"]);
    expect(form.featureModels).toEqual({ summarize_chat: "gpt-6-astra" });
    expect(form.operatorBudgets).toEqual({ "7": "3" });
  });
});

describe("formKey", () => {
  it("ignores the order of the selected models and of the operators", () => {
    const base = formFromConfig(config({ operatorBudgets: { "1": 2, "3": 4 } }));
    const reordered = {
      ...base,
      selectedModels: [...base.selectedModels].reverse(),
      operatorBudgets: { "3": "4", "1": "2" },
    };

    expect(formKey(reordered)).toBe(formKey(base));
  });

  it("changes when a value changes", () => {
    const base = formFromConfig(config());

    expect(formKey({ ...base, defaultModel: "gpt-6-sol" })).not.toBe(formKey(base));
    expect(formKey({ ...base, budget: "10" })).not.toBe(formKey(base));
  });
});

describe("parsePositiveUsd", () => {
  it("accepts comma or dot and rejects zero, negatives and text", () => {
    expect(parsePositiveUsd("12,5")).toBe(12.5);
    expect(parsePositiveUsd(" 3.25 ")).toBe(3.25);
    expect(parsePositiveUsd("0")).toBeNull();
    expect(parsePositiveUsd("-1")).toBeNull();
    expect(parsePositiveUsd("abc")).toBeNull();
    expect(parsePositiveUsd("")).toBeNull();
  });
});

describe("validateForm", () => {
  it("saves no restriction when every Assistant model or none is marked", () => {
    const all = validateForm(formFromConfig(config()));
    const none = validateForm({ ...formFromConfig(config()), selectedModels: [] });

    expect(all.ok && all.payload.availableModels).toBeNull();
    expect(none.ok && none.payload.availableModels).toBeNull();
  });

  it("keeps a restricted list, including models outside the catalog", () => {
    const result = validateForm({ ...formFromConfig(config()), selectedModels: ["gpt-6-luna", "o3"] });

    expect(result.ok && result.payload.availableModels).toEqual(["gpt-6-luna", "o3"]);
  });

  it("builds the payload with numbers and drops empty overrides", () => {
    const result = validateForm({
      defaultModel: "gpt-6-sol",
      budget: "50,00",
      selectedModels: [],
      featureModels: { summarize_chat: "gpt-6-luna", suggest_response: "  " },
      operatorBudgets: { "9": "2.5" },
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        model: "gpt-6-sol",
        monthlyBudgetUsd: 50,
        availableModels: null,
        featureModels: { summarize_chat: "gpt-6-luna" },
        operatorBudgets: { "9": 2.5 },
      },
    });
  });

  it("points to the invalid field", () => {
    const base = formFromConfig(config());

    expect(validateForm({ ...base, budget: "0" })).toMatchObject({ ok: false, field: "budget" });
    expect(validateForm({ ...base, operatorBudgets: { "4": "" } })).toMatchObject({ ok: false, field: "operator:4" });
  });
});
