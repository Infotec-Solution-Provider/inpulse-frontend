import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Customer, UpdateCustomerDTO } from "@in.pulse-crm/sdk";
import { toast } from "react-toastify";
import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useRef } from "react";
import { useCustomersContext } from "../../customers-context";

export interface EditModalProps {
  customer: Customer;
}

const validateKey: Record<keyof UpdateCustomerDTO, (value: unknown) => boolean> = {
  RAZAO: (value: unknown) => !!value && typeof value === "string" && value.length <= 100,
  CPF_CNPJ: (value: unknown) =>
    value
      ? typeof value === "string" && (/^[0-9]{11}$/.test(value) || /^[0-9]{14}$/.test(value))
      : true,
  FANTASIA: (value: unknown) => (value ? typeof value === "string" && value.length <= 60 : true),
  PESSOA: (value: unknown) => (value ? value === "FIS" || value === "JUR" : true),
  CIDADE: (value: unknown) => (value ? typeof value === "string" && value.length <= 60 : true),
  ATIVO: (value: unknown) => (value ? value === "SIM" || value === "NAO" : true),
  COD_ERP: (value: unknown) => (value ? typeof value === "string" && value.length <= 20 : true),
  ESTADO: (value: unknown) => (value ? typeof value === "string" && value.length <= 2 : true),
  SETOR: (value: unknown) => (value ? typeof value === "number" : true),
};

export default function EditCustomerModal({ customer }: EditModalProps) {
  const { closeModal } = useAppContext();
  const { updateCustomer } = useCustomersContext();

  const formRef = useRef<UpdateCustomerDTO>({
    ATIVO: customer.ATIVO,
    COD_ERP: customer.COD_ERP,
    CIDADE: customer.CIDADE,
    CPF_CNPJ: customer.CPF_CNPJ,
    FANTASIA: customer.FANTASIA,
    PESSOA: customer.PESSOA,
    RAZAO: customer.RAZAO,
  });

  const onClickSave = async () => {
    const isValid = validateForm(formRef.current);

    if (isValid) {
      updateCustomer(customer?.CODIGO, formRef.current);
    }
    closeModal();
  };

  const validateForm = (data: UpdateCustomerDTO) => {
    const invalidKeys: (keyof Customer)[] = [];

    for (const key in data) {
      const value = data[key as keyof UpdateCustomerDTO];
      const isValid = validateKey[key as keyof UpdateCustomerDTO](value);

      if (!isValid) {
        invalidKeys.push(key as keyof Customer);
      }
    }

    if (invalidKeys.length > 0) {
      toast.error(
        `Por favor, preencha os seguintes campos corretamente:\n- ${invalidKeys.join("\n- ")}`,
      );

      return false;
    }

    return true;
  };

  return (
    <aside className="flex h-full w-full max-w-4xl flex-col gap-6 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
      <header className="flex w-full items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          Editar Cliente
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
            name="RAZAO"
            type="text"
            id="RAZAO"
            defaultValue={customer.RAZAO}
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
            name="FANTASIA"
            type="text"
            id="FANTASIA"
            defaultValue={customer.FANTASIA}
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
            name="CPF_CNPJ"
            type="text"
            id="CPF_CNPJ"
            defaultValue={customer.CPF_CNPJ}
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
            name="CIDADE"
            type="text"
            fullWidth
            defaultValue={customer.CIDADE}
            id="CIDADE"
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
            name="COD_ERP"
            type="text"
            defaultValue={customer.COD_ERP}
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
              formRef.current = { ...formRef.current, COD_ERP: e.target.value.trim() ?? "" };
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            name="ATIVO"
            defaultValue={customer.ATIVO}
            label="Ativo"
            fullWidth
            select
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
              formRef.current = {
                ...formRef.current,
                ATIVO: e.target.value as "SIM" | "NAO" | null,
              };
            }}
          >
            <MenuItem value="SIM">Sim</MenuItem>
            <MenuItem value="NAO">Não</MenuItem>
          </TextField>
          <TextField
            select
            label="Tipo de Pessoa"
            name="PESSOA"
            defaultValue={customer.PESSOA}
            id="PESSOA"
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
              formRef.current = {
                ...formRef.current,
                PESSOA: e.target.value as "FIS" | "JUR" | null,
              };
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
          onClick={onClickSave}
          className="bg-indigo-600 px-6 py-2 hover:bg-indigo-700"
        >
          Salvar
        </Button>
      </div>
    </aside>
  );
}
