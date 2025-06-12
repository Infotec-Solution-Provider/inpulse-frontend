export default function toDateString(date: Date | string = ""): string {
  if (!date) {
    return "N/D"
  }

  if (typeof date === "string") {
    date = new Date(date);
  }

  //Retornar no formato DD/MM/YY HH:mm
  return (
    date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }) +
    " " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}
