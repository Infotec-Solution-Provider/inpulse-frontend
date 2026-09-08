import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { InternalMessage, MessageMentionEntity } from "@/lib/sdk-local";
import MessageMentionText, { MentionDirectoryContext } from "./message-mention-text";
import { createMentionDirectory } from "../utils/message-mentions";
import Message from "@/app/(private)/[instance]/(main)/(chat)/message";
import GroupMessage from "@/app/(private)/[instance]/(main)/(chat)/group-message";
import getQuotedMsgProps from "@/app/(private)/[instance]/(main)/(chat)/(utils)/getQuotedMsgProps";

vi.mock("@/app/(private)/[instance]/whatsapp-context", () => ({
  useWhatsappContext: () => ({ parameters: {}, channels: [] }),
}));
vi.mock("@/app/(private)/[instance]/(main)/(chat)/message-file", () => ({ default: () => null }));
vi.mock("@/app/(private)/[instance]/(main)/(chat)/message-reactions", () => ({
  default: () => null,
}));

const entities: MessageMentionEntity[] = [{ id: "777@lid", type: "lid", tokens: ["@777"] }];
const directory = createMentionDirectory([], [], new Map([["777@lid", "Nome manual"]]));
const render = (element: React.ReactNode) =>
  renderToStaticMarkup(
    <MentionDirectoryContext.Provider value={directory}>
      {element}
    </MentionDirectoryContext.Provider>,
  );

describe("shared mention UI", () => {
  it("displays names with accessible original identity and preserves line breaks", () => {
    const html = render(
      <MessageMentionText text={"Olá @777\nTudo bem?"} mentionEntities={entities} />,
    );
    expect(html).toContain("@Nome manual");
    expect(html).toContain("777@lid");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("\nTudo bem?");
  });
  it("makes an unknown participant identity accessible without substituting the message author", () => {
    const html = renderToStaticMarkup(
      <MessageMentionText text="@777" mentionEntities={entities} />,
    );
    expect(html).toContain("@Participante não identificado");
    expect(html).toContain("Identidade: 777@lid");
  });
  it("uses the same display resolver in WhatsApp captions and quoted bodies", () => {
    const html = render(
      <Message
        id={1}
        style="received"
        text="Legenda @777"
        mentionEntities={entities}
        type="image"
        date={new Date(0)}
        quotedMessage={{
          id: 2,
          style: "received",
          text: "Citação @777",
          mentionEntities: entities,
          author: "Autor original",
        }}
      />,
    );
    expect(html).toContain("Legenda ");
    expect(html.match(/>@Nome manual</g)).toHaveLength(2);
    expect(html).toContain("Autor original");
  });
  it("uses the same display resolver for groups without changing sender or raw quote data", () => {
    const message = {
      id: 2,
      from: "777@lid",
      body: "Citação @777",
      mentionEntities: entities,
    } as InternalMessage;
    const quote = getQuotedMsgProps(message, "received", []);
    expect(quote?.text).toBe("Citação @777");
    expect(quote?.mentionEntities).toBe(entities);
    const html = render(
      <GroupMessage
        id={1}
        style="received"
        sentBy="Autor do grupo"
        groupFirst
        text="Grupo @777"
        mentionEntities={entities}
        type="chat"
        date={new Date(0)}
        quotedMessage={quote}
      />,
    );
    expect(html.match(/>@Nome manual</g)).toHaveLength(2);
    expect(html).toContain("Autor do grupo");
    expect(message.body).toBe("Citação @777");
  });
});
