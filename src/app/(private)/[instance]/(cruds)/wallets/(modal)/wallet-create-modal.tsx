import { TextField, Button } from "@mui/material";
import { useContext, useState } from "react";
import { WalletsContext } from "../context";
import { StyledDialog, StyledDialogTitle } from "./styles-modal";

export default function CreateWalletModal() {
  const { createWallet, loading } = useContext(WalletsContext);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });

  const handleSubmit = async () => {
    if (!form.name) return;

    const success = await createWallet(form.name);

    if (success) {
      setForm({ name: "" });
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Nova carteira
      </Button>
      <StyledDialog open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-6 bg-slate-800 px-[2rem] py-[1rem]">
          <StyledDialogTitle>Criar nova carteira</StyledDialogTitle>
          <div className="flex flex-col gap-4">
            <TextField
              required
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="ip-crud-form-footer flex w-full flex-row justify-end gap-4 border-t-[2px] border-blue-500 pt-[1rem]">
            <Button color="error" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} variant="contained" disabled={!form.name || loading}>
              {loading ? "Criando..." : "Criar"}
            </Button>
          </div>
        </div>
      </StyledDialog>
    </>
  );
}
