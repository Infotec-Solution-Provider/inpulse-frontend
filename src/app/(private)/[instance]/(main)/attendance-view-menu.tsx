"use client";

import { useId, useState } from "react";
import { ListSubheader, Menu, MenuItem } from "@mui/material";
import { Check } from "lucide-react";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import type { AttendanceView } from "./attendance-view";

export interface AttendanceViewOptions {
  view: AttendanceView;
  selectView: (view: AttendanceView) => void;
}

export function attendanceViewItems(
  { view, selectView }: AttendanceViewOptions,
  close: () => void,
) {
  return [
    <ListSubheader key="view-label" disableSticky>
      Visualização do atendimento
    </ListSubheader>,
    ...(["classic", "integrated"] as const).map((option) => (
      <MenuItem
        key={option}
        role="menuitemradio"
        aria-checked={view === option}
        onClick={() => {
          close();
          selectView(option);
        }}
      >
        {option === "classic" ? "Clássico" : "Integrado"}
        <span className="attendance-view-check">
          {view === option && <Check size={15} aria-hidden />}
        </span>
      </MenuItem>
    )),
  ];
}

export function AttendanceViewMenu({ options }: { options: AttendanceViewOptions }) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <OperationalIconButton
        label="Opções de visualização"
        tooltip="Visualização do atendimento"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <UiIcon name="more" scale="toolbar" />
      </OperationalIconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ list: { "aria-label": "Visualização do atendimento" } }}
      >
        {attendanceViewItems(options, close)}
      </Menu>
    </>
  );
}
