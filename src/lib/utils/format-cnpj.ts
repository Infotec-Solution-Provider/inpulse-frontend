export default function formatCpfCnpj(value: string | null) {
  if (!value) return "";

  if (value.length === 14)
    return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  else if (value.length === 11)
    return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  else return value;
}
