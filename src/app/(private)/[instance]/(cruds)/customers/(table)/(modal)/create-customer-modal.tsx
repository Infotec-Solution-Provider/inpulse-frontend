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
    <aside className="flex h-full w-full flex-col items-center gap-4 bg-white p-4 dark:bg-slate-800">
      <header className="flex text-lg w-full font-semibold font-medium items-center justify-between py-2 text-slate-800 dark:text-white">
        Cadastrar Cliente
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          fullWidth
          label="Razão Social"
          name="razao"
          type="text"
          id="razao"
          required
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
          onChange={(e) => {
            formRef.current = { ...formRef.current, FANTASIA: e.target.value };
          }}
        />
      </div>
      <div className="flex flex-row justify-center gap-4">
        <TextField
          label="CPF/CNPJ"
          name="cpf"
          type="text"
          id="cpf"
          fullWidth
          required
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
          onChange={(e) => {
            formRef.current = { ...formRef.current, CIDADE: e.target.value };
          }}
        />
        <TextField
          label="ERP"
          name="erp"
          type="text"
          fullWidth
          onChange={(e) => {
            formRef.current = { ...formRef.current, COD_ERP: e.target.value ?? "" };
          }}
        />
      </div>
      <div className="flex h-full w-full flex-row items-center gap-4">
        <TextField
          name="active"
          label="Ativo"
          fullWidth
          select
          required
          onChange={(e) => {
            formRef.current = { ...formRef.current, ATIVO: e.target.value as "SIM" | "NAO" };
          }}
        >
          <MenuItem value="SIM" key="SIM">
            Sim
          </MenuItem>
          <MenuItem value="NAO" key="NAO">
            Não
          </MenuItem>
        </TextField>
        <TextField
          select
          label="Tipo de Pessoa"
          name="Tipo de Pessoa"
          id="personType"
          fullWidth
          required
          onChange={(e) => {
            formRef.current = { ...formRef.current, PESSOA: e.target.value as "FIS" | "JUR" };
          }}
        >
          <MenuItem value="FIS" key="FIS">
            Física
          </MenuItem>
          <MenuItem value="JUR" key="JUR">
            Jurídica
          </MenuItem>
        </TextField>
      </div>

      <div className="flex w-full flex-row items-center justify-end gap-4">
        <Button color="error" onClick={closeModal}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>Cadastrar</Button>
      </div>
    </aside>
  );
}
