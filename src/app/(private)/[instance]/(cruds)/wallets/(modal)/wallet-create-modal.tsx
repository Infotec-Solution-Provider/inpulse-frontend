import { TextField, Button } from "@mui/material";
import { useContext, useState } from "react";
import { WalletsContext } from "../context";
import { StyledDialog, StyledDialogTitle } from "./styles-modal";

export default function CreateWalletModal() {
    const { createWallet, loading } = useContext(WalletsContext);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = async () => {
        if (!name) return;
        
        const success = await createWallet(name);
        if (success) {
            setName('');
            setOpen(false);
        }
    };

    return (
        <>
            <Button variant="outlined" onClick={() => setOpen(true)}>
                Cadastrar carteira
            </Button>
            <StyledDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:px-6 sm:py-6 dark:bg-slate-800 max-h-[90vh] min-h-0 overflow-y-auto">
                    <StyledDialogTitle>Criar nova carteira</StyledDialogTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full items-center">
                        <TextField
                            label="Nome da carteira"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{ margin: 0 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={!name || loading}
                            className="w-full sm:w-auto h-10 sm:h-[40px] min-w-[120px] sm:min-w-[150px]"
                        >
                            {loading ? "Criando..." : "Criar"}
                        </Button>
                    </div>
                    <div className="flex w-full flex-row justify-end gap-4 pt-4 border-t-2 border-blue-500">
                        <Button 
                            color="error" 
                            onClick={() => setOpen(false)}
                            className="min-w-[100px]"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </StyledDialog>
        </>
    );
}