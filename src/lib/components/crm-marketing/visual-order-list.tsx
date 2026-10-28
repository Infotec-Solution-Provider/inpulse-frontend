"use client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Alert, Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, GripVertical } from "lucide-react";
import { useRef, useState } from "react";

export interface VisualOrderItem {
  id: number | string;
  name: string | null;
  uf?: string | null;
  paused?: boolean;
  validUf?: boolean;
  showId?: boolean;
}
export function moveOrder<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
const rowHeight = 92,
  viewport = 460;
function OrderRow({
  item,
  index,
  count,
  disabled,
  highlighted,
  move,
}: {
  item: VisualOrderItem;
  index: number;
  count: number;
  disabled: boolean;
  highlighted: boolean;
  move: (from: number, to: number) => void;
}) {
  const id = String(item.id);
  const drag = useDraggable({ id, disabled }),
    drop = useDroppable({ id, disabled });
  const label = `${item.name ?? "Sem nome"}${item.uf !== undefined ? ` — ${item.uf ?? "Sem UF"}` : ""}`;
  return (
    <Box
      role="listitem"
      aria-posinset={index + 1}
      aria-setsize={count}
      ref={(node: HTMLDivElement | null) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      sx={{
        position: "absolute",
        top: index * rowHeight,
        height: rowHeight - 4,
        left: 0,
        right: 0,
        border: "1px solid",
        borderColor: highlighted || drop.isOver ? "primary.main" : "divider",
        borderRadius: 1,
        bgcolor: highlighted ? "action.selected" : "background.paper",
        opacity: drag.isDragging ? 0.4 : 1,
        px: 1,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      <IconButton
        {...drag.listeners}
        {...drag.attributes}
        ref={drag.setActivatorNodeRef}
        disabled={disabled}
        size="small"
        aria-label={`Mover ${label}. Alt mais setas para ordenar`}
        data-order-handle={id}
        sx={{ touchAction: "none", cursor: "grab", minWidth: 40, minHeight: 44 }}
        onKeyDown={(event) => {
          if (!event.altKey || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          move(
            index,
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? count - 1
                : index + (event.key === "ArrowUp" ? -1 : 1),
          );
        }}
      >
        <GripVertical size={18} />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap title={label}>
          <strong>{index + 1}.</strong> {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.showId === false ? "" : String(item.id)}
          {item.paused ? " · Pausada" : ""}
          {item.validUf === false ? " · UF inválida: corrija o cadastro" : ""}
        </Typography>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 36px)" }}>
        {[
          ["Início", 0, ChevronsUp],
          ["Subir", index - 1, ArrowUp],
          ["Fim", count - 1, ChevronsDown],
          ["Descer", index + 1, ArrowDown],
        ].map(([action, target, Icon]) => {
          const Component = Icon as typeof ArrowUp;
          return (
            <IconButton
              key={String(action)}
              size="small"
              aria-label={`${action} ${label}`}
              disabled={
                disabled ||
                Number(target) < 0 ||
                Number(target) >= count ||
                Number(target) === index
              }
              onClick={() => move(index, Number(target))}
              sx={{ minWidth: 36, minHeight: 36 }}
            >
              <Component size={17} />
            </IconButton>
          );
        })}
      </Box>
    </Box>
  );
}
export function VisualOrderList({
  items,
  onChange,
  disabled = false,
}: {
  items: VisualOrderItem[];
  onChange: (items: VisualOrderItem[]) => void;
  disabled?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0),
    [search, setSearch] = useState(""),
    [highlight, setHighlight] = useState<number | string | null>(null),
    [announcement, announce] = useState(""),
    [dragged, setDragged] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
  );
  const start = Math.max(0, Math.floor(scroll / rowHeight) - 4),
    end = Math.min(items.length, Math.ceil((scroll + viewport) / rowHeight) + 4);
  function reveal(index: number) {
    scroller.current?.scrollTo({
      top: Math.max(0, index * rowHeight - rowHeight),
      behavior: "instant",
    });
  }
  function move(from: number, to: number) {
    const result = moveOrder(items, from, to);
    if (result === items || disabled) return;
    const item = items[from];
    onChange(result);
    setHighlight(item.id);
    reveal(to);
    announce(`${item.name ?? item.id}: posição ${to + 1} de ${items.length}.`);
    requestAnimationFrame(() =>
      scroller.current
        ?.querySelector<HTMLButtonElement>(`[data-order-handle="${CSS.escape(String(item.id))}"]`)
        ?.focus({ preventScroll: true }),
    );
  }
  function locate() {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const matches = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        `${item.name ?? ""} ${item.id} ${item.uf ?? ""}`.toLocaleLowerCase("pt-BR").includes(query),
      );
    const current = matches.findIndex((match) => match.item.id === highlight),
      next = matches[(current + 1) % matches.length];
    if (!query || !next) {
      announce("Nenhum item encontrado.");
      return;
    }
    setHighlight(next.item.id);
    reveal(next.index);
    announce(`Encontrado na posição ${next.index + 1}. A lista completa permanece disponível.`);
  }
  return (
    <Stack gap={1}>
      <Stack
        component="form"
        direction="row"
        gap={1}
        onSubmit={(event) => {
          event.preventDefault();
          locate();
        }}
      >
        <TextField
          size="small"
          label="Localizar na sequência"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: 1 }}
        />
        <Button type="submit">Localizar próximo</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {items.length} itens · Arraste pela alça ou use os botões. Na alça: Alt + ↑/↓, Home/End. A
        busca não filtra a lista.
      </Typography>
      {!items.length && <Alert severity="info">Nenhum item nesta lista.</Alert>}
      <DndContext
        sensors={sensors}
        onDragStart={(event) => setDragged(String(event.active.id))}
        onDragCancel={() => setDragged(null)}
        onDragEnd={(event) => {
          setDragged(null);
          if (!event.over) return;
          move(
            items.findIndex((item) => String(item.id) === String(event.active.id)),
            items.findIndex((item) => String(item.id) === String(event.over!.id)),
          );
        }}
      >
        <Box
          ref={scroller}
          onScroll={(event) => setScroll(event.currentTarget.scrollTop)}
          role="list"
          aria-label="Sequência completa de prioridades"
          sx={{
            height: Math.min(viewport, Math.max(rowHeight, items.length * rowHeight)),
            overflow: "auto",
            position: "relative",
            borderRadius: 1,
          }}
        >
          <Box sx={{ height: items.length * rowHeight, position: "relative" }}>
            {items.slice(start, end).map((item, offset) => (
              <OrderRow
                key={item.id}
                item={item}
                index={start + offset}
                count={items.length}
                disabled={disabled}
                highlighted={highlight === item.id}
                move={move}
              />
            ))}
          </Box>
        </Box>
        <DragOverlay>
          {dragged !== null && (
            <Box sx={{ p: 2, bgcolor: "background.paper", boxShadow: 3 }}>
              {items.find((item) => String(item.id) === dragged)?.name ?? dragged}
            </Box>
          )}
        </DragOverlay>
      </DndContext>
      <Typography role="status" aria-live="polite" variant="caption">
        {announcement}
      </Typography>
    </Stack>
  );
}
