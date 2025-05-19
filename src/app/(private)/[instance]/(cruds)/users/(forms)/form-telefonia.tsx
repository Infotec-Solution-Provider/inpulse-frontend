import { FormControlLabel, Switch, TextField } from "@mui/material";
import { User } from "@in.pulse-crm/sdk";

interface FormTelefoniaProps {
  formData: Partial<User>;
  onFormChange: (data: Partial<User>) => void;
}

export default function FormTelefonia({ formData, onFormChange }: FormTelefoniaProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-row justify-center gap-4">
        <FormControlLabel
          label="Visualiza compras"
          labelPlacement="start"
          control={
            <Switch
              checked={formData.VISUALIZA_COMPRAS === "SIM"}
              onChange={(e) =>
                onFormChange({ VISUALIZA_COMPRAS: e.target.checked ? "SIM" : "NAO" })
              }
            />
          }
        />
        <FormControlLabel
          label="Edita/insere contatos"
          labelPlacement="start"
          control={
            <Switch
              checked={formData.EDITA_CONTATOS === "SIM"}
              onChange={(e) => onFormChange({ EDITA_CONTATOS: e.target.checked ? "SIM" : "NAO" })}
            />
          }
        />
        <FormControlLabel
          label="Liga pra representante"
          labelPlacement="start"
          control={
            <Switch
              checked={formData.LIGA_REPRESENTANTE === "SIM"}
              onChange={(e) =>
                onFormChange({ LIGA_REPRESENTANTE: e.target.checked ? "SIM" : "NAO" })
              }
            />
          }
        />
      </div>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          label="Liga pra representante dias"
          name="LIGA_REPRESENTANTE_DIAS"
          type="number"
          fullWidth
          size="small"
          value={formData.LIGA_REPRESENTANTE_DIAS}
          onChange={(e) => onFormChange({ LIGA_REPRESENTANTE_DIAS: Number(e.target.value) })}
        />
        <TextField
          label="Limite diário de agendamento"
          name="limite_diario_agendamento"
          type="number"
          fullWidth
          size="small"
          value={formData.limite_diario_agendamento}
          onChange={(e) => onFormChange({ limite_diario_agendamento: Number(e.target.value) })}
        />
      </div>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          label="CodTelefonia"
          name="CODTELEFONIA"
          fullWidth
          size="small"
          value={formData.CODTELEFONIA}
          onChange={(e) => onFormChange({ CODTELEFONIA: e.target.value })}
        />
        <TextField
          label="OMNI"
          name="OMNI"
          type="number"
          fullWidth
          size="small"
          value={formData.OMNI}
          onChange={(e) => onFormChange({ OMNI: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
