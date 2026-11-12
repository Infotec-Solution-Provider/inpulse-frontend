import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const selection = vi.hoisted(() => ({ canSwitch: false }));
vi.mock("@/app/auth-context", () => ({
  useAuthContext: () => ({ instance: "homolog", user: { CODIGO: 1 }, status: "authenticated" }),
}));
vi.mock("./frontend-session-gate", () => ({ useFrontendSelection: () => selection }));
import FrontendVersionSwitch from "./frontend-version-switch";

describe("frontend version switch", () => {
  it("renders no wrapper or blank bar when switching is disabled", () => {
    selection.canSwitch = false;
    expect(renderToStaticMarkup(<FrontendVersionSwitch />)).toBe("");
  });
  it("renders its wrapper and link when switching is enabled", () => {
    selection.canSwitch = true;
    expect(renderToStaticMarkup(<FrontendVersionSwitch />)).toContain("Experimentar nova versão");
  });
});
