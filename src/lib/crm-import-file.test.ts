import { describe, expect, it } from "vitest";
import { importCsvHeaders } from "./crm-import-file";
describe("CSV headers for mapping", () => {
  it("supports BOM, delimiters, escaped quotes and quoted header newlines", () => {
    expect(importCsvHeaders('\uFEFF"Código;CRM";"Nome ""comercial"""\r\n1;Empresa', ";")).toEqual([
      "Código;CRM",
      'Nome "comercial"',
    ]);
    expect(importCsvHeaders('"Nome\ncompleto",Documento\nA,123', ",")).toEqual([
      "Nome\ncompleto",
      "Documento",
    ]);
  });
  it.each(["A;A\n1;2", "A;\n1;2", '"A"x;B\n1;2', '"A;B', 'A;"B""'])(
    "rejects invalid headers %s",
    (text) => expect(() => importCsvHeaders(text, ";")).toThrow(),
  );
  it("limits local header parsing", () => {
    expect(() =>
      importCsvHeaders(Array.from({ length: 65 }, (_, index) => `C${index}`).join(";"), ";"),
    ).toThrow();
    expect(() => importCsvHeaders("A".repeat(4097), ";")).toThrow();
  });
});
