"use client";

import type { ReactNode } from "react";
import { Box, DialogTitle, IconButton } from "@mui/material";
import { X } from "lucide-react";
import { UiIcon } from "@/lib/ui-system/icons";

interface TelephonyDialogTitleProps {
  id: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}

export function TelephonyDialogTitle({
  id,
  children,
  onClose,
  closeDisabled,
}: TelephonyDialogTitleProps) {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        pl: 3,
        pr: 1.5,
        py: 1,
      }}
    >
      <DialogTitle id={id} sx={{ p: 0, minWidth: 0 }}>
        {children}
      </DialogTitle>
      <IconButton
        aria-label="Fechar"
        onClick={onClose}
        disabled={closeDisabled}
        sx={{ width: 44, height: 44, flexShrink: 0 }}
      >
        <UiIcon icon={X} />
      </IconButton>
    </Box>
  );
}
