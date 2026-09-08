"use client";

import { createContext, useContext, useMemo } from "react";
import { Tooltip } from "@mui/material";
import type { MessageMentionEntity } from "@/lib/sdk-local";
import { EMPTY_MENTION_DIRECTORY, resolveMessageMentions } from "../utils/message-mentions";

export const MentionDirectoryContext = createContext(EMPTY_MENTION_DIRECTORY);

export default function MessageMentionText({
  text,
  mentionEntities,
}: {
  text: string;
  mentionEntities?: MessageMentionEntity[];
}) {
  const directory = useContext(MentionDirectoryContext);
  const segments = useMemo(
    () => resolveMessageMentions(text || "", mentionEntities, directory),
    [text, mentionEntities, directory],
  );
  return (
    <p className="max-w-full whitespace-pre-wrap break-words text-sm">
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          segment.text
        ) : (
          <Tooltip
            key={index}
            title={`Identidade: ${segment.identity} · Texto original: ${segment.rawToken}`}
          >
            <span
              tabIndex={0}
              className="font-medium"
              aria-label={`${segment.text}. Identidade: ${segment.identity}`}
            >
              {segment.text}
            </span>
          </Tooltip>
        ),
      )}
    </p>
  );
}
