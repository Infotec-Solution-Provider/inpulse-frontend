/** Read just the header locally. All records are validated by the API before any mutation. */
export function importCsvHeaders(text: string, delimiter: string): string[] {
  if (![",", ";", "\t"].includes(delimiter)) throw new Error("Selecione o delimitador do CSV.");
  const source = text.replace(/^\uFEFF/, "");
  const columns: string[] = [];
  let cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i <= source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === undefined) throw new Error("Cabeçalho com aspas não fechadas.");
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === delimiter || char === "\n" || char === "\r" || char === undefined) {
      columns.push(cell.trim());
      cell = "";
      closed = false;
      if (char !== delimiter) break;
    } else if (char === '"' && !cell && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error("Aspas inválidas no cabeçalho.");
      cell += char;
    }
    if (cell.length > 4096 || columns.length > 64)
      throw new Error("Limite de 64 colunas e 4096 caracteres por célula.");
  }
  if (
    columns.length > 64 ||
    columns.some((value) => !value) ||
    new Set(columns).size !== columns.length
  )
    throw new Error("O CSV precisa de cabeçalhos únicos e preenchidos.");
  return columns;
}
