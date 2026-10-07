import { describe, expect, it } from "vitest";
import {
  AI_MODEL_CATALOG,
  AI_MODEL_TIERS,
  ASSISTANT_MODEL_CATALOG,
  getOffCatalogModels,
  isWholeCatalogSelected,
  modelLabel,
  modelSupportsAssistant,
  modelSupportsTemperature,
} from "./ai-model-catalog";

describe("AI_MODEL_CATALOG", () => {
  it("leaves out the models that were not tested", () => {
    const values = AI_MODEL_CATALOG.map((model) => model.value);

    for (const model of ["o3", "o3-mini", "o4-mini", "o1-mini", "gpt-4-turbo", "gpt-3.5-turbo"]) {
      expect(values).not.toContain(model);
    }
  });

  it("keeps the default agent model and has no duplicates", () => {
    const values = AI_MODEL_CATALOG.map((model) => model.value);

    expect(values).toContain("gpt-5.4");
    expect(new Set(values).size).toBe(values.length);
  });

  it("lists the GPT-6 generation first", () => {
    expect(AI_MODEL_CATALOG.slice(0, 4).map((model) => model.value)).toEqual([
      "gpt-6-astra",
      "gpt-6.1-sol",
      "gpt-6-sol",
      "gpt-6-luna",
    ]);
  });

  it("gives every model a known tier, a description and a positive price", () => {
    const tiers = new Set(AI_MODEL_TIERS.map((tier) => tier.value));

    for (const model of AI_MODEL_CATALOG) {
      expect(tiers.has(model.tier)).toBe(true);
      expect(model.description.length).toBeGreaterThan(0);
      expect(model.pricing.input).toBeGreaterThan(0);
      expect(model.pricing.output).toBeGreaterThanOrEqual(model.pricing.input);
    }
  });

  it("points deprecated models to a replacement that is in the catalog", () => {
    const values = AI_MODEL_CATALOG.map((model) => model.value);

    for (const model of AI_MODEL_CATALOG.filter((entry) => entry.deprecation)) {
      expect(values).toContain(model.deprecation!.replacement);
      expect(model.deprecation!.shutdownAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("Assistant compatibility", () => {
  it("keeps GPT-6 Astra and GPT-6.1 Sol out of the Assistant", () => {
    const values = ASSISTANT_MODEL_CATALOG.map((model) => model.value);

    expect(values).not.toContain("gpt-6-astra");
    expect(values).not.toContain("gpt-6.1-sol");
    expect(values).toContain("gpt-6-sol");
    expect(values).toContain("gpt-6-luna");
    expect(modelSupportsAssistant("gpt-6-astra")).toBe(false);
    expect(modelSupportsAssistant("gpt-5.4")).toBe(true);
  });

  it("leaves off-catalog models to the ai-service", () => {
    expect(modelSupportsAssistant("o3")).toBe(true);
    expect(modelLabel("o3")).toBe("o3");
    expect(modelLabel("gpt-6-luna")).toBe("GPT-6 Luna");
  });
});

describe("isWholeCatalogSelected", () => {
  const catalogValues = AI_MODEL_CATALOG.map((model) => model.value);

  it("is true only when every catalog model is selected and nothing else", () => {
    expect(isWholeCatalogSelected(catalogValues)).toBe(true);
    expect(isWholeCatalogSelected([...catalogValues].reverse())).toBe(true);
  });

  it("is false for a restricted list with the same size as the catalog", () => {
    // Lista gravada antes do corte: o mesmo tamanho do catálogo atual, mas com modelos removidos.
    const restricted = [...catalogValues.slice(0, -3), "o3-mini", "o4-mini", "gpt-3.5-turbo"];

    expect(restricted).toHaveLength(catalogValues.length);
    expect(isWholeCatalogSelected(restricted)).toBe(false);
  });

  it("is false when a model is missing or an off-catalog model is also selected", () => {
    expect(isWholeCatalogSelected(catalogValues.slice(1))).toBe(false);
    expect(isWholeCatalogSelected([...catalogValues, "o3"])).toBe(false);
    expect(isWholeCatalogSelected([])).toBe(false);
  });
});

describe("getOffCatalogModels", () => {
  it("returns the saved models that are not in the catalog, once and in order", () => {
    expect(getOffCatalogModels(["gpt-5.4", "o3", "gpt-3.5-turbo", "o3", "gpt-4o"])).toEqual(["o3", "gpt-3.5-turbo"]);
  });

  it("returns an empty list when every model is in the catalog", () => {
    expect(getOffCatalogModels(["gpt-5.4", "gpt-4o-mini"])).toEqual([]);
    expect(getOffCatalogModels([])).toEqual([]);
  });
});

describe("modelSupportsTemperature", () => {
  it("returns false for the o-series reasoning models", () => {
    expect(modelSupportsTemperature("o3")).toBe(false);
    expect(modelSupportsTemperature("o4-mini")).toBe(false);
    expect(modelSupportsTemperature("o1-mini")).toBe(false);
  });

  it("returns false for the base gpt-5 family, except gpt-5-chat", () => {
    expect(modelSupportsTemperature("gpt-5")).toBe(false);
    expect(modelSupportsTemperature("gpt-5-mini")).toBe(false);
    expect(modelSupportsTemperature("gpt-5-chat-latest")).toBe(true);
  });

  it("returns false for the gpt-6 family", () => {
    expect(modelSupportsTemperature("gpt-6-astra")).toBe(false);
    expect(modelSupportsTemperature("gpt-6.1-sol")).toBe(false);
    expect(modelSupportsTemperature("gpt-6-luna")).toBe(false);
  });

  it("returns false for the gpt-5.6 family", () => {
    expect(modelSupportsTemperature("gpt-5.6-sol")).toBe(false);
    expect(modelSupportsTemperature("gpt-5.6")).toBe(false);
    expect(modelSupportsTemperature(" GPT-5.6-Terra ")).toBe(false);
  });

  it("returns true for the models that keep using temperature", () => {
    expect(modelSupportsTemperature("gpt-5.4")).toBe(true);
    expect(modelSupportsTemperature("gpt-5.5")).toBe(true);
    expect(modelSupportsTemperature("gpt-4o")).toBe(true);
    expect(modelSupportsTemperature("gpt-4o-mini")).toBe(true);
    expect(modelSupportsTemperature("")).toBe(true);
  });
});
