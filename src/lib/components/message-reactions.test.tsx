import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MessageReactions from "@/app/(private)/[instance]/(main)/(chat)/message-reactions";

vi.mock("emoji-picker-react", () => ({ default: () => null, EmojiStyle: {}, Theme: {} }));

describe("reaction authors in the shared message UI", () => {
  it("exposes the internal sender through a focusable details button and hover label", () => {
    const html = renderToStaticMarkup(
      <MessageReactions
        identity="wpp:7"
        reactions={[
          {
            actorId: "self",
            fromMe: true,
            emoji: "👍",
            reactedAt: "2026-09-08T12:00:00Z",
            internalUserId: 7,
            internalUserName: "Ana",
          },
        ]}
      />,
    );
    expect(html).toContain('<button type="button"');
    expect(html).toContain("👍: Ana. Ver quem reagiu");
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("does not invent an internal sender for legacy or own-device reactions", () => {
    const html = renderToStaticMarkup(
      <MessageReactions
        identity="internal:7"
        reactions={[
          {
            actorId: "self",
            fromMe: true,
            emoji: "👍",
            reactedAt: "2026-09-08T12:00:00Z",
          },
        ]}
      />,
    );
    expect(html).toContain("usuário interno não identificado");
  });
});
