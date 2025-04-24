import {
  Button,
  Dialog,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Customer, UpdateCustomerDTO } from "@in.pulse-crm/sdk";
import customersService from "@/lib/services/customers.service";
import { toast } from "react-toastify";

export interface EditModalProps {
  open: boolean;
  client: Partial<Customer>;
  onClose: (value: UpdateCustomerDTO) => void;
}

let formData: UpdateCustomerDTO = {};

export default function EditModal({ onClose, client, open }: EditModalProps) {
  function handleClose() {
    onClose(client);
  }

  function handleSubmit() {
    const validkeyValues = {
      RAZAO: (value: unknown) => typeof value === "string",
      FANTASIA: (value: unknown) => typeof value === "string",
      CPF_CNPJ: (value: unknown) =>
        typeof value === "string" && (/^[0-9]{11}$/.test(value) || /^[0-9]{14}$/.test(value)),
      PESSOA: (value: unknown) => typeof value === "string" && ["FIS", "JUR"].includes(value),
      CIDADE: (value: unknown) => typeof value === "string",
      ATIVO: (value: unknown) => value === "SIM" || value === "NAO",
      COD_ERP: (value: unknown) => typeof value === "string" || null || undefined,
    };

    const invalidKeys = Object.entries(formData)
      .filter(
        ([key, value]) =>
          !(key in validkeyValues) || !validkeyValues[key as keyof typeof validkeyValues](value),
      )
      .map(([key]) => key);

    if (invalidKeys.length > 0) {
      toast.error(
        `Por favor, preencha os seguintes campos corretamente: ${invalidKeys.join(", ")}`,
      );
    } else {
      if (client.CODIGO !== undefined) {
        customersService.updateCustomer(client.CODIGO, formData).then(() => {
          toast.success("Cliente cadastrado com sucesso!");
          onClose({
            ...client,
            ...formData,
          });
        });
      }
    }
  }

  return (
    <Dialog
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          handleClose();
        }
      }}
      open={open}
    >
      <FormControl>
        <div className="flex h-full w-full flex-col items-center gap-4 bg-slate-800 p-4">
          <DialogTitle sx={{ paddingLeft: 0.5, paddingTop: 0 }} className="w-full text-left">
            Editar Cliente
          </DialogTitle>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={(theme) => ({
              fontSize: 18,
              position: "absolute",
              right: 8,
              top: 8,
              color: theme.palette.primary.light,
            })}
          >
            <CloseIcon />
          </IconButton>
          <div className="flex w-full flex-row justify-center gap-4">
            <TextField
              fullWidth
              label="Razão Social"
              name="RAZAO"
              type="text"
              id="RAZAO"
              defaultValue={client.RAZAO}
              required
              onChange={(e) => {
                formData = { ...formData, RAZAO: e.target.value };
              }}
            />
            <TextField
              fullWidth
              label="Fantasia"
              name="FANTASIA"
              type="text"
              id="FANTASIA"
              defaultValue={client.FANTASIA}
              onChange={(e) => {
                formData = { ...formData, FANTASIA: e.target.value };
              }}
            />
          </div>
          <div className="flex flex-row justify-center gap-4">
            <TextField
              label="CPF/CNPJ"
              name="CPF_CNPJ"
              type="text"
              id="CPF_CNPJ"
              defaultValue={client.CPF_CNPJ}
              fullWidth
              required
              onChange={(e) => {
                formData = { ...formData, CPF_CNPJ: e.target.value.trim() };
              }}
            />
            <TextField
              label="Cidade"
              name="CIDADE"
              type="text"
              fullWidth
              defaultValue={client.CIDADE}
              id="CIDADE"
              required
              onChange={(e) => {
                formData = { ...formData, CIDADE: e.target.value };
              }}
            />
            <TextField
              label="ERP"
              name="COD_ERP"
              type="text"
              defaultValue={client.COD_ERP}
              fullWidth
              onChange={(e) => {
                formData = { ...formData, COD_ERP: e.target.value.trim() ?? "" };
              }}
            />
          </div>
          <div className="flex h-full w-full flex-row items-center gap-4">
            <TextField
              name="ATIVO"
              defaultValue={client.ATIVO}
              label="Ativo"
              fullWidth
              select
              required
              onChange={(e) => {
                formData = { ...formData, ATIVO: e.target.value as "SIM" | "NAO" | null };
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
              defaultValue={client.PESSOA}
              id="PESSOA"
              fullWidth
              required
              onChange={(e) => {
                formData = { ...formData, PESSOA: e.target.value as "FIS" | "JUR" | null };
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
            <Button color="error" onClick={handleClose}>
              Cancelar
            </Button>

            <Button onClick={handleSubmit}>Salvar</Button>
          </div>
        </div>
      </FormControl>
    </Dialog>
  );
}
