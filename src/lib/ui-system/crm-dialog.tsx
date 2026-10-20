"use client";
import { Dialog as MuiDialog, type DialogProps } from "@mui/material";
import { PilotDesignProvider } from "./provider";

/** Nested menus and confirmations must portal inside their owning modal layer. */
export function CrmDialog({ children, ...props }: DialogProps) {
  return (
    <MuiDialog {...props}>
      <PilotDesignProvider className="ip-crud-dialog" style={{ display: "contents" }}>
        {children}
      </PilotDesignProvider>
    </MuiDialog>
  );
}
