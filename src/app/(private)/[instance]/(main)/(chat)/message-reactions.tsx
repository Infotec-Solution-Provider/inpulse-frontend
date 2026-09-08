"use client";

import { useEffect, useRef, useState } from "react";
import { Button, CircularProgress, IconButton, Popover, Tooltip } from "@mui/material";
import AddReactionOutlinedIcon from "@mui/icons-material/AddReactionOutlined";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { toast } from "react-toastify";
import type { MessageReaction } from "@/lib/sdk-local";
import { groupMessageReactions } from "@/lib/utils/message-reactions";

interface MessageReactionsProps {
  identity: string;
  reactions?: MessageReaction[];
  legacyReaction?: string;
  onChange?: (emoji: string) => Promise<unknown>;
  actorNames?: Map<string, string>;
  showReactions?: boolean;
}

export default function MessageReactions({
  identity,
  reactions,
  legacyReaction,
  onChange,
  actorNames,
  showReactions = true,
}: MessageReactionsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);
  const requestPending = useRef(false);
  const epoch = useRef(0);
  useEffect(() => {
    epoch.current += 1;
    requestPending.current = false;
    setPending(false);
    setAnchor(null);
    return () => {
      epoch.current += 1;
    };
  }, [identity]);

  const groups = showReactions ? groupMessageReactions(reactions ?? []) : [];
  const ownReaction = reactions?.find((reaction) => reaction.fromMe);
  const changeReaction = async (emoji: string) => {
    if (!onChange || requestPending.current) return;
    if (emoji && ownReaction?.emoji === emoji) {
      setAnchor(null);
      return;
    }
    const startedEpoch = epoch.current;
    requestPending.current = true;
    setPending(true);
    try {
      await onChange(emoji);
      if (startedEpoch === epoch.current) setAnchor(null);
    } catch (error) {
      if (startedEpoch === epoch.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar a reação. Atualize a conversa antes de tentar novamente.",
        );
      }
    } finally {
      if (startedEpoch === epoch.current) {
        requestPending.current = false;
        setPending(false);
      }
    }
  };

  const actorName = (reaction: MessageReaction) => {
    if (reaction.fromMe) return "Esta conta WhatsApp";
    if (reaction.actorId === "legacy:unknown") return "Participante não identificado";
    const address = reaction.actorId.split("@")[0];
    return actorNames?.get(reaction.actorId) ?? actorNames?.get(address) ?? address;
  };

  if (!onChange && !groups.length && (!legacyReaction || reactions)) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-1 self-start"
      onClick={(event) => event.stopPropagation()}
    >
      {groups.map((group) => (
        <Tooltip key={group.emoji} title={group.actors.map(actorName).join(", ")}>
          <span
            className={`rounded-full border px-2 py-0.5 text-sm shadow-sm ${group.fromMe ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950" : "border-transparent bg-white dark:bg-slate-700"}`}
          >
            {group.emoji}
            {group.count > 1 ? ` ${group.count}` : ""}
          </span>
        </Tooltip>
      ))}
      {showReactions && !reactions && legacyReaction && (
        <span className="rounded-full bg-white px-2 py-0.5 text-sm shadow-sm dark:bg-slate-700">
          {legacyReaction}
        </span>
      )}
      {onChange && (
        <>
          <IconButton
            className="invisible group-hover:visible"
            size="small"
            aria-label={ownReaction ? "Alterar reação desta conta WhatsApp" : "Reagir à mensagem"}
            title={ownReaction ? "Alterar reação desta conta WhatsApp" : "Reagir à mensagem"}
            disabled={pending}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            {pending ? (
              <CircularProgress size={16} />
            ) : (
              <AddReactionOutlinedIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
          <Popover
            open={!!anchor}
            anchorEl={anchor}
            onClose={() => {
              if (!pending) setAnchor(null);
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <div className="max-w-[calc(100vw-24px)] p-2" aria-busy={pending}>
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                Reação da conta WhatsApp compartilhada
              </p>
              <div className={pending ? "pointer-events-none opacity-50" : ""}>
                <EmojiPicker
                  onEmojiClick={(data) => void changeReaction(data.emoji)}
                  theme={Theme.AUTO}
                  emojiStyle={EmojiStyle.NATIVE}
                  width={300}
                  height={350}
                  searchPlaceHolder="Buscar emoji"
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis
                />
              </div>
              {ownReaction && (
                <Button
                  color="error"
                  size="small"
                  disabled={pending}
                  onClick={() => void changeReaction("")}
                >
                  Remover reação desta conta
                </Button>
              )}
              {pending && (
                <p role="status" className="mt-1 text-xs">
                  Aguardando confirmação da reação...
                </p>
              )}
            </div>
          </Popover>
        </>
      )}
    </div>
  );
}
