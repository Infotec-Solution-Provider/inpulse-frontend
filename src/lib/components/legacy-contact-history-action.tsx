"use client";
import { useEffect, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import LegacyContactHistoryModal from "./legacy-contact-history-modal";

export default function LegacyContactHistoryAction({ contactId }: { contactId: number }) {
  const { user, token } = useAuthContext();
  const { parameters } = useWhatsappContext();
  const [open, setOpen] = useState(false);
  const allowed = Boolean(token) && user?.NIVEL === "ADMIN" && Number.isSafeInteger(contactId) && contactId > 0 &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.legacyHistory);
  useEffect(() => { if (!allowed) setOpen(false); }, [allowed]);
  if (!allowed) return null;
  return <>
    <Tooltip title="Histórico sem atendimento"><IconButton aria-label="Histórico sem atendimento" size="small" color="primary" onClick={() => setOpen(true)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
    {open && <LegacyContactHistoryModal contactId={contactId} onClose={() => setOpen(false)} />}
  </>;
}
