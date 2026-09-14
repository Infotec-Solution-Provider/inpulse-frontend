import type { ReactNode } from "react";

// Keep message media and action dependencies outside the layout regression.
// The real list renderer, ChatProvider, pending bubbles and status stay mounted.
export default function ScrollMessage({ id, text, sendStatus }: {
  id: string | number;
  text?: string | null;
  sendStatus?: ReactNode;
}) {
  return <li data-message-id={id} className="scroll-message">{text}{sendStatus}</li>;
}
