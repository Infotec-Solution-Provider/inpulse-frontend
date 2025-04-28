import { TextField, Button } from "@mui/material";
import { useContext, useState } from "react";
import { WalletsContext } from "../context";
import { StyledDialog, StyledDialogTitle } from "./styles-modal";

export default function CreateWalletModal() {
    const { createWallet, loading } = useContext(WalletsContext);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ instance: '', name: '' });

    const handleSubmit = async () => {
        if (!form.instance || !form.name) return;

        const success = await createWallet(form.instance, form.name);

        if (success) {
            setForm({ instance: '', name: '' });
            setOpen(false);
        }
    };

    return (
        <>
            <Button variant="outlined" onClick={() => setOpen(true)}>
                Cadastrar carteira
            </Button>
            <StyledDialog open={open} onClose={() => setOpen(false)}>
                <div className="flex flex-col gap-6 px-[2rem] py-[1rem] bg-slate-800">
                    <StyledDialogTitle>Criar nova carteira</StyledDialogTitle>
                    <div className="flex flex-col gap-4">
                        <TextField
                            label="Instância"
                            value={form.instance}
                            onChange={(e) => setForm(p => ({ ...p, instance: e.target.value }))}
                        />
                        <TextField
                            label="Nome"
                            value={form.name}
                            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                        />
                    </div>
                    <div className="flex w-full flex-row justify-end gap-4 pt-[1rem] border-t-[2px] border-blue-500">
                        <Button color="error" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={!form.instance || !form.name || loading}
                        >
                            {loading ? "Criando..." : "Criar"}
                        </Button>
                    </div>
                </div>
            </StyledDialog>
        </>
    );
}