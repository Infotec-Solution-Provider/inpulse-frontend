import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { CreateCustomerDTO } from "@in.pulse-crm/sdk";
import { useRef } from "react";
import { useAppContext } from "@/app/(private)/[instance]/app-context";
import CloseIcon from "@mui/icons-material/Close";
import { useCustomersContext } from "../../customers-context";

export default function CreateCustomerModal() {
  const { closeModal } = useAppContext();
  const { createCustomer } = useCustomersContext();

  const formRef = useRef<CreateCustomerDTO>({
    ATIVO: "SIM",
    RAZAO: "",
  });

  const handleSubmit = async () => {
    if (!formRef.current.RAZAO) {
      toast.error("Razão Social é obrigatória!");
      return;
    }
    createCustomer(formRef.current);
    closeModal();
  }

  return (
    <aside className="flex h-full w-full max-w-4xl flex-col gap-6 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
      <header className="flex w-full items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          Cadastrar Cliente
        </h1>
        <IconButton 
          onClick={closeModal}
          className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            fullWidth
            label="Razão Social"
            name="razao"
            type="text"
            id="razao"
            required
            variant="outlined"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, RAZAO: e.target.value };
            }}
          />
          <TextField
            fullWidth
            label="Fantasia"
            name="fantasy"
            type="text"
            id="fantasy"
            variant="outlined"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, FANTASIA: e.target.value };
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField
            label="CPF/CNPJ"
            name="cpf"
            type="text"
            id="cpf"
            fullWidth
            required
            variant="outlined"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, CPF_CNPJ: e.target.value.trim() };
            }}
          />
          <TextField
            label="Cidade"
            name="city"
            type="text"
            fullWidth
            id="city"
            required
            variant="outlined"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, CIDADE: e.target.value };
            }}
          />
          <TextField
            label="Código ERP"
            name="erp"
            type="text"
            fullWidth
            variant="outlined"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, COD_ERP: e.target.value ?? "" };
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            name="active"
            label="Ativo"
            fullWidth
            select
            required
            variant="outlined"
            defaultValue="SIM"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, ATIVO: e.target.value as "SIM" | "NAO" };
            }}
          >
            <MenuItem value="SIM">Sim</MenuItem>
            <MenuItem value="NAO">Não</MenuItem>
          </TextField>
          <TextField
            select
            label="Tipo de Pessoa"
            name="Tipo de Pessoa"
            id="personType"
            fullWidth
            required
            variant="outlined"
            className="bg-white dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
            onChange={(e) => {
              formRef.current = { ...formRef.current, PESSOA: e.target.value as "FIS" | "JUR" };
            }}
          >
            <MenuItem value="FIS">Física</MenuItem>
            <MenuItem value="JUR">Jurídica</MenuItem>
          </TextField>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <Button 
          variant="outlined" 
          color="error" 
          onClick={closeModal}
          className="px-6 py-2"
        >
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          className="bg-indigo-600 px-6 py-2 hover:bg-indigo-700"
        >
          Cadastrar
        </Button>
      </div>
    </aside>
  );
}
