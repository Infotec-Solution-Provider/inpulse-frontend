"use client";

import { Button, Chip, MenuItem, Switch, TextField, Typography } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import type {
  ParameterSetting,
  ParameterSource,
  ParameterSettingsSnapshot,
} from "./parameter-settings.types";

interface Props {
  setting: ParameterSetting;
  source: ParameterSource;
  value: string | null;
  changed: boolean;
  resetting: boolean;
  disabled: boolean;
  error?: string;
  scoped?: boolean;
  inherited?: NonNullable<ParameterSettingsSnapshot["inherited"]>[string];
  onChange: (value: string) => void;
  onReset: () => void;
}

export function ParameterSettingControl({
  setting,
  source,
  value,
  changed,
  resetting,
  disabled,
  error,
  scoped = false,
  inherited,
  onChange,
  onReset,
}: Props) {
  const effectiveValue =
    resetting || (source === "whatsapp" && value === null)
      ? (inherited?.value ?? setting.defaultValue)
      : value;
  const multiplier = setting.multiplier ?? 1;
  const isDefault = source === "whatsapp" ? value === null : value === setting.defaultValue;
  const stateLabel = resetting
    ? scoped
      ? "Herdado ao salvar"
      : "Padrão ao salvar"
    : changed
      ? "Alterado"
      : isDefault
        ? scoped
          ? "Herdado"
          : "Padrão"
        : value === null
          ? "Não definido"
          : "Personalizado";

  return (
    <div
      className="flex flex-col gap-4 border-t border-slate-200 py-5 first:border-t-0 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between"
      data-testid={`parameter-${setting.key}`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Typography component="h3" fontWeight={600}>
            {setting.label}
          </Typography>
          <Chip
            label={stateLabel}
            size="small"
            color={changed ? "primary" : "default"}
            variant="outlined"
          />
        </div>
        <Typography variant="body2" color="text.secondary">
          {setting.description}
        </Typography>
        {scoped && inherited && (
          <Typography variant="caption" color="text.secondary" display="block">
            Valor herdado{" "}
            {inherited.source === "SECTOR"
              ? "do setor"
              : inherited.source === "INSTANCE"
                ? "da instância"
                : "do padrão"}
            :{" "}
            {setting.type === "boolean"
              ? inherited.value === null
                ? "Padrão do provedor"
                : inherited.value === setting.trueValue
                  ? "Ativado"
                  : "Desativado"
              : inherited.value === null
                ? "Não definido"
                : `${Number(inherited.value) / multiplier} ${setting.unit ?? ""}`}
            .
          </Typography>
        )}
        {source === "whatsapp" &&
          setting.type === "boolean" &&
          setting.defaultValue === null &&
          value === null && (
            <Typography variant="caption" color="text.secondary">
              O comportamento padrão depende do provedor configurado.
            </Typography>
          )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        {setting.type === "boolean" && source === "whatsapp" && setting.defaultValue === null ? (
          <TextField
            select
            label="Sincronização"
            size="small"
            sx={{ width: 180 }}
            disabled={disabled}
            value={effectiveValue ?? "default"}
            slotProps={{
              select: {
                SelectDisplayProps: { "aria-label": setting.label, "aria-labelledby": undefined },
              },
            }}
            onChange={(event) =>
              event.target.value === "default" ? onReset() : onChange(event.target.value)
            }
          >
            <MenuItem value="default">Padrão do provedor</MenuItem>
            <MenuItem value={setting.trueValue}>Ativada</MenuItem>
            <MenuItem value={setting.falseValue}>Desativada</MenuItem>
          </TextField>
        ) : setting.type === "boolean" ? (
          <Switch
            checked={effectiveValue === setting.trueValue}
            disabled={disabled}
            slotProps={{ input: { "aria-label": setting.label } }}
            onChange={(_, checked) => onChange(checked ? setting.trueValue! : setting.falseValue!)}
          />
        ) : (
          <TextField
            label={setting.unit || "Valor"}
            size="small"
            type="number"
            sx={{ width: 160 }}
            value={
              effectiveValue === null || effectiveValue === ""
                ? ""
                : Number(effectiveValue) / multiplier
            }
            disabled={disabled}
            error={!!error}
            helperText={error}
            slotProps={{
              htmlInput: {
                "aria-label": setting.label,
                min: setting.min,
                max: setting.max,
                step: 1,
              },
            }}
            onChange={(event) =>
              onChange(
                event.target.value === "" ? "" : String(Number(event.target.value) * multiplier),
              )
            }
          />
        )}
        {scoped && isDefault && !resetting && effectiveValue !== null ? (
          <Button
            size="small"
            disabled={disabled}
            onClick={() => onChange(effectiveValue)}
            aria-label={`Personalizar: ${setting.label}`}
          >
            Personalizar
          </Button>
        ) : (
          <Button
            size="small"
            startIcon={<RestoreIcon />}
            onClick={onReset}
            disabled={disabled || resetting || isDefault || setting.canReset === false}
            aria-label={`${scoped ? "Usar valor herdado" : "Usar padrão"}: ${setting.label}`}
          >
            {scoped ? "Usar valor herdado" : "Usar padrão"}
          </Button>
        )}
      </div>
    </div>
  );
}
