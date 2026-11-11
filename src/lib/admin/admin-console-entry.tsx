"use client";
import { useState } from "react";
import { Button, CircularProgress, MenuItem } from "@mui/material";
import { Settings2 } from "lucide-react";
import { useAuthContext } from "@/app/auth-context";
import { toast } from "react-toastify";
import { bootstrapAdminSession, canOpenAdminConsole } from "./access";

/** A full document navigation crosses into the independently served console. */
export function AdminConsoleEntry({ menu = false }: { menu?: boolean }) {
  const { instance, user, token } = useAuthContext();
  const [busy, setBusy] = useState(false);
  if (!canOpenAdminConsole(instance, user?.NIVEL)) return null;
  const open = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      await bootstrapAdminSession(token);
      window.location.assign("/infotec/admin/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir a administração.");
      setBusy(false);
    }
  };
  const icon = busy ? <CircularProgress size={16} /> : <Settings2 size={18} />;
  return menu ? (
    <MenuItem disabled={busy} onClick={() => void open()} sx={{ gap: 1.5, fontSize: 13 }}>
      {icon}Administração
    </MenuItem>
  ) : (
    <Button size="small" disabled={busy} startIcon={icon} onClick={() => void open()}>
      Administração
    </Button>
  );
}
