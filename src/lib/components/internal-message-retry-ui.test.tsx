import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GroupMessage from "@/app/(private)/[instance]/(main)/(chat)/group-message";
import RetryInternalMessageModal from "@/app/(private)/[instance]/(main)/(chat)/retry-internal-message-modal";

vi.mock("emoji-picker-react", () => ({ default: () => null, EmojiStyle: {}, Theme: {} }));

function renderGroupMessage(props: Partial<React.ComponentProps<typeof GroupMessage>> = {}) {
  return renderToStaticMarkup(
    <GroupMessage
      id={76897}
      style="sent"
      sentBy="Ana"
      groupFirst
      text="texto"
      type="chat"
      date={new Date("2026-10-06T14:35:08Z")}
      status="ERROR"
      {...props}
    />,
  );
}

describe("Reenviar action on internal group messages", () => {
  it("renders an always-visible Reenviar action for failed messages with onRetry", () => {
    const html = renderGroupMessage({ onRetry: () => undefined });
    expect(html).toContain('aria-label="Reenviar para o grupo do WhatsApp"');
    expect(html).toContain(">Reenviar</button>");
    // A ação compacta não depende de hover (o botão "Mais opções" sim).
    expect(html).not.toMatch(/class="[^"]*invisible[^"]*"[^>]*aria-label="Reenviar/);
  });

  it("does not render Reenviar without onRetry or when the message is not in ERROR", () => {
    expect(renderGroupMessage()).not.toContain("Reenviar");
    expect(renderGroupMessage({ status: "PENDING", onRetry: () => undefined })).not.toContain(
      "Reenviar",
    );
    expect(renderGroupMessage({ status: "RECEIVED", onRetry: () => undefined })).not.toContain(
      "Reenviar",
    );
  });

  it("never offers Reenviar on system messages", () => {
    expect(renderGroupMessage({ style: "system", onRetry: () => undefined })).not.toContain(
      "Reenviar",
    );
  });
});

describe("RetryInternalMessageModal", () => {
  it("warns that the group may receive the message twice", () => {
    const html = renderToStaticMarkup(
      <RetryInternalMessageModal onConfirm={async () => undefined} onClose={() => undefined} />,
    );
    expect(html).toContain("Reenviar ao grupo do WhatsApp?");
    expect(html).toContain(
      "Não foi possível confirmar se esta mensagem chegou ao grupo. Se ela tiver chegado, o grupo vai recebê-la duas vezes.",
    );
    expect(html).toContain("Cancelar");
    expect(html).toContain("dark:bg-slate-800");
    expect(html).toContain("background-image:none");
  });
});
