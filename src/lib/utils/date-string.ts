export default function toDateString(date?: Date | string): string {
  if (!date) {
    return "N/D";
  }

  if (typeof date === "string") {
    date = new Date(date);
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "N/D";
  }

  //Retornar no formato DD/MM/YY HH:mm
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
