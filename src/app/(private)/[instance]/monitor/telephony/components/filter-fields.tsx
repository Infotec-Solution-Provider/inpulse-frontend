import { UiIcon } from "@/lib/ui-system";
import { Button, TextField } from "@mui/material";
import type { TelephonyDateRange, TelephonyLookupOption } from "../types";

export function TelephonyDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TelephonyDateRange;
  onChange: (range: TelephonyDateRange) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="ip-telephony-metadata ip-muted mb-1 font-medium">{label}</legend>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <TextField
          fullWidth
          size="small"
          type="date"
          label="De"
          value={value.from ?? ""}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { "aria-label": `${label}: de`, max: value.to || undefined },
          }}
          onChange={(event) => onChange({ ...value, from: event.target.value || null })}
        />
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Até"
          value={value.to ?? ""}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { "aria-label": `${label}: até`, min: value.from || undefined },
          }}
          onChange={(event) => onChange({ ...value, to: event.target.value || null })}
        />
      </div>
    </fieldset>
  );
}

export function TelephonyLookupField({
  label,
  selection,
  multiple,
  onOpen,
  disabled,
  helperText,
  fieldId,
}: {
  label: string;
  selection: TelephonyLookupOption[];
  multiple: boolean;
  onOpen: () => void;
  disabled?: boolean;
  helperText?: string;
  fieldId?: string;
}) {
  const value = selection.length
    ? multiple
      ? `${selection.length} selecionados`
      : selection[0].label
    : "Selecionar";
  return (
    <div className="min-w-0">
      <p className="ip-telephony-metadata ip-muted mb-1 font-medium">{label}</p>
      <Button
        id={fieldId}
        type="button"
        variant="outlined"
        fullWidth
        size="small"
        endIcon={<UiIcon name="search" scale="metadata" />}
        onClick={onOpen}
        disabled={disabled}
        aria-label={`Selecionar ${label.toLowerCase()}`}
        sx={{
          minHeight: 36,
          justifyContent: "space-between",
          textTransform: "none",
          color: selection.length ? "var(--ip-text)" : "var(--ip-muted)",
          borderColor: "var(--ip-border)",
          bgcolor: "var(--ip-surface)",
          "&:hover": { borderColor: "var(--ip-muted)", bgcolor: "var(--ip-surface-muted)" },
        }}
      >
        <span className="truncate" title={selection.map((option) => option.label).join(", ")}>
          {value}
        </span>
      </Button>
      {helperText && <p className="ip-muted mt-1 text-xs">{helperText}</p>}
    </div>
  );
}
