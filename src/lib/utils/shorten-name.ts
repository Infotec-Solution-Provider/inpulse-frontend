export function getShortenedName(name: string) {
  // Remove tudo que não for letra ou espaços
  const cleanedName = name.replace(/[^a-zA-Z\s]/g, "").trim();
  
  // O retorno de ser: Primeironome + Sobrenome primeira letra +.
  const parts = cleanedName.split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]; // Se só tiver um nome, retorna ele inteiro
  
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstName} ${lastNameInitial}.`;
}