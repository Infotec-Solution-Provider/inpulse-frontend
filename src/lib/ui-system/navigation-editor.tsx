"use client";

import {
  DndContext,
  MouseSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { UiIcon } from "./icons";
import { navigationGroupTrail, type NavigationItem } from "./navigation";
import {
  defaultNavigationPreferences,
  moveNavigationItem,
  navigationRoot,
  orderedNavigationLevel,
  type NavigationPreferences,
} from "./navigation-preferences";

function EditorRow({
  item,
  hidden,
  index,
  count,
  move,
  toggle,
  openGroup,
}: {
  item: NavigationItem;
  hidden: boolean;
  index: number;
  count: number;
  move: (from: number, to: number) => void;
  toggle: (id: string) => void;
  openGroup: (id: string) => void;
}) {
  const drag = useDraggable({ id: item.id });
  const drop = useDroppable({ id: item.id });
  const movement = [
    { label: "Subir", icon: ArrowUp, to: index - 1 },
    { label: "Descer", icon: ArrowDown, to: index + 1 },
  ];
  return (
    <Box
      component="li"
      ref={(node: HTMLLIElement | null) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      style={{ transform: CSS.Translate.toString(drag.transform) }}
      sx={{
        position: "relative",
        zIndex: drag.isDragging ? 1 : undefined,
        display: "flex",
        alignItems: "center",
        gap: { xs: 0, sm: 0.5 },
        px: { xs: 0.5, sm: 1 },
        minHeight: 48,
        border: 1,
        borderColor: drop.isOver ? "primary.main" : "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
      }}
    >
      <Box
        component="span"
        ref={drag.setActivatorNodeRef}
        {...drag.listeners}
        aria-hidden="true"
        title="Arrastar para reordenar"
        sx={{
          display: { xs: "none", sm: "inline-flex" },
          alignItems: "center",
          px: 0.5,
          alignSelf: "stretch",
          cursor: drag.isDragging ? "grabbing" : "grab",
          color: "text.secondary",
        }}
      >
        <UiIcon icon={GripVertical} scale="toolbar" />
      </Box>
      <Typography
        variant="body2"
        color={hidden ? "text.secondary" : "text.primary"}
        sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", py: 0.5 }}
      >
        {item.title}
      </Typography>
      {item.kind === "group" && (
        <Tooltip title="Editar submenu">
          <IconButton
            aria-label={`Editar submenu ${item.title}`}
            onClick={() => openGroup(item.id)}
            size="small"
            sx={{ width: 36, height: 44 }}
          >
            <UiIcon icon={ChevronRight} scale="toolbar" />
          </IconButton>
        </Tooltip>
      )}
      {movement.map(({ label, icon, to }) => (
        <Tooltip key={label} title={label}>
          <IconButton
            aria-label={`${label} ${item.title}`}
            aria-disabled={to < 0 || to >= count}
            onClick={() => move(index, to)}
            size="small"
            sx={{ width: 36, height: 44, "&[aria-disabled='true']": { color: "action.disabled" } }}
          >
            <UiIcon icon={icon} scale="toolbar" />
          </IconButton>
        </Tooltip>
      ))}
      <Switch
        checked={!hidden}
        onChange={() => toggle(item.id)}
        size="small"
        sx={{ mr: 0.5, height: 44, py: "17px", "& .MuiSwitch-switchBase": { py: "14px" } }}
        slotProps={{ input: { role: "switch", "aria-label": `Exibir ${item.title}` } }}
      />
    </Box>
  );
}

export function NavigationEditor({
  catalog,
  preferences,
  onSave,
  onCancel,
}: {
  catalog: NavigationItem[];
  preferences: NavigationPreferences;
  onSave: (preferences: NavigationPreferences) => boolean;
  onCancel: () => void;
}) {
  const titleId = useId();
  const levelId = useId();
  const levelHeading = useRef<HTMLHeadingElement>(null);
  const fullScreen = useMediaQuery("(max-width:599px)");
  const mouse = useSensor(MouseSensor, { activationConstraint: { distance: 6 } });
  const [draft, setDraft] = useState(preferences);
  const [trail, setTrail] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [saveError, setSaveError] = useState(false);

  const groups = navigationGroupTrail(catalog, trail);
  const group = groups.at(-1);
  const parent = group?.id ?? navigationRoot;
  const siblings = orderedNavigationLevel(group?.routes ?? catalog, draft.order[parent]);

  useLayoutEffect(() => {
    levelHeading.current?.focus();
  }, [parent]);

  function move(from: number, to: number) {
    const next = moveNavigationItem(draft, parent, siblings, from, to);
    if (next === draft) return;
    setDraft(next);
    setAnnouncement(`${siblings[from].title} na posição ${to + 1} de ${siblings.length}.`);
  }

  function toggle(id: string) {
    setDraft((current) => ({
      ...current,
      hidden: current.hidden.includes(id)
        ? current.hidden.filter((hidden) => hidden !== id)
        : [...current.hidden, id],
    }));
  }

  function reset() {
    setDraft(defaultNavigationPreferences);
    setAnnouncement("Ordem e visibilidade padrão prontas para salvar.");
  }

  return (
    <Dialog
      open
      onClose={onCancel}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>Personalizar navegação</DialogTitle>
      <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Use as setas para ordenar e os interruptores para mostrar ou ocultar itens.
        </Typography>
        {groups.length > 0 && (
          <Button
            startIcon={<UiIcon icon={ChevronLeft} scale="metadata" />}
            onClick={() => setTrail(groups.slice(0, -1).map((group) => group.id))}
            size="small"
            sx={{ mb: 1, minHeight: 44 }}
          >
            Voltar para {groups.at(-2)?.title ?? "barra principal"}
          </Button>
        )}
        <Typography
          id={levelId}
          ref={levelHeading}
          component="h2"
          tabIndex={-1}
          fontSize={14}
          fontWeight={600}
          sx={{ mb: 1, overflowWrap: "anywhere" }}
        >
          {["Barra principal", ...groups.map((group) => group.title)].join(" / ")}
        </Typography>
        <DndContext
          sensors={[mouse]}
          collisionDetection={pointerWithin}
          onDragEnd={({ active, over }) => {
            if (!over) return;
            move(
              siblings.findIndex((item) => item.id === active.id),
              siblings.findIndex((item) => item.id === over.id),
            );
          }}
        >
          <Box
            component="ul"
            aria-labelledby={levelId}
            sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}
          >
            {siblings.map((item, index) => (
              <EditorRow
                key={item.id}
                item={item}
                hidden={draft.hidden.includes(item.id)}
                index={index}
                count={siblings.length}
                move={move}
                toggle={toggle}
                openGroup={(id) => setTrail([...groups.map((group) => group.id), id])}
              />
            ))}
          </Box>
        </DndContext>
        <Box
          role="status"
          sx={{
            position: "absolute",
            overflow: "hidden",
            width: 1,
            height: 1,
            clipPath: "inset(50%)",
          }}
        >
          {announcement}
        </Box>
        {saveError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Não foi possível salvar a navegação neste navegador. Tente novamente.
          </Alert>
        )}
      </DialogContent>
      <DialogActions disableSpacing sx={{ flexWrap: "wrap", px: { xs: 1.5, sm: 3 } }}>
        <Button onClick={reset} sx={{ mr: "auto" }}>
          Restaurar padrão
        </Button>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => {
            if (!onSave(draft)) setSaveError(true);
          }}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
