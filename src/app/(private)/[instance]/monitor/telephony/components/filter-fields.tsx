import SearchIcon from "@mui/icons-material/Search";
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
      <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </legend>
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
}: {
  label: string;
  selection: TelephonyLookupOption[];
  multiple: boolean;
  onOpen: () => void;
  disabled?: boolean;
  helperText?: string;
}) {
  const value = selection.length
    ? multiple
      ? `${selection.length} selecionados`
      : selection[0].label
    : "Selecionar";
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
      <Button
        type="button"
        variant="outlined"
        fullWidth
        size="small"
        endIcon={<SearchIcon />}
        onClick={onOpen}
        disabled={disabled}
        aria-label={`Selecionar ${label.toLowerCase()}`}
        sx={{ minHeight: 40, justifyContent: "space-between", textTransform: "none" }}
      >
        <span className="truncate" title={selection.map((option) => option.label).join(", ")}>
          {value}
        </span>
      </Button>
      {helperText && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
