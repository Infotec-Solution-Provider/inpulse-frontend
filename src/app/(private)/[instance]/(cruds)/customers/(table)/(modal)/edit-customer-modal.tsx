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
      updateCustomer(customer.CODIGO, formRef.current);
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
    <aside className="flex h-full w-full flex-col items-center gap-4 bg-white p-4 dark:dark:bg-slate-800">
      <header className="flex text-lg w-full font-semibold font-medium items-center justify-between py-2 text-slate-800 dark:text-white">
        <h1>Editar cliente</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          fullWidth
          label="Razão Social"
          name="RAZAO"
          type="text"
          id="RAZAO"
          defaultValue={customer.RAZAO}
          required
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
          onChange={(e) => {
            formRef.current = { ...formRef.current, FANTASIA: e.target.value };
          }}
        />
      </div>
      <div className="flex flex-row justify-center gap-4">
        <TextField
          label="CPF/CNPJ"
          name="CPF_CNPJ"
          type="text"
          id="CPF_CNPJ"
          defaultValue={customer.CPF_CNPJ}
          fullWidth
          required
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
          onChange={(e) => {
            formRef.current = { ...formRef.current, CIDADE: e.target.value };
          }}
        />
        <TextField
          label="ERP"
          name="COD_ERP"
          type="text"
          defaultValue={customer.COD_ERP}
          fullWidth
          onChange={(e) => {
            formRef.current = { ...formRef.current, COD_ERP: e.target.value.trim() ?? "" };
          }}
        />
      </div>
      <div className="flex h-full w-full flex-row items-center gap-4">
        <TextField
          name="ATIVO"
          defaultValue={customer.ATIVO}
          label="Ativo"
          fullWidth
          select
          required
          onChange={(e) => {
            formRef.current = {
              ...formRef.current,
              ATIVO: e.target.value as "SIM" | "NAO" | null,
            };
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
          name="PESSOA"
          defaultValue={customer.PESSOA}
          id="PESSOA"
          fullWidth
          required
          onChange={(e) => {
            formRef.current = {
              ...formRef.current,
              PESSOA: e.target.value as "FIS" | "JUR" | null,
            };
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
        <Button onClick={onClickSave}>Salvar</Button>
      </div>
    </aside>
  );
}
