import Message from "./message";

export default function ChatMessagesList() {
  return (
    <ul className="flex flex-col gap-2 overflow-y-auto bg-slate-300/10 p-2">
      <Message style="system" text="Conversa iniciada pelo cliente" date={new Date("2025-04-16")} />
      <Message style="received" text="Boa tarde" date={new Date("2025-04-16")} />
      <Message
        style="sent"
        text="Olá, boa tarde! Como posso ajudar?"
        date={new Date("2025-04-16")}
      />
      <Message
        style="received"
        text="Estou interessada em conhecer os produtos de vocês!"
        date={new Date("2025-04-16")}
      />
      <Message
        style="received"
        text="Poderia me enviar o catálogo, por favor?"
        date={new Date("2025-04-16")}
      />
    </ul>
  );
}
