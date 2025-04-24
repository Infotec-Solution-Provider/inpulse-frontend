import {
  Button,
  Dialog,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { toast } from "react-toastify";
import customersService from "@/lib/services/customers.service";
import { CreateCustomerDTO, Customer } from "@in.pulse-crm/sdk";

export interface CreateModalProps {
  open: boolean;
  onClose: () => void;
}

let formData: Partial<Customer> = {};

export default function CreateModal({ onClose, open }: CreateModalProps) {
  function handleClose() {
    onClose();
  }

  function handleSubmit() {
    const missingFields = [];
    if (!formData.RAZAO) missingFields.push("Razão Social");
    if (!formData.CPF_CNPJ) missingFields.push("CPF");
    if (!formData.CIDADE) missingFields.push("Cidade");
    if (formData.ATIVO === undefined) missingFields.push("Ativo");
    if (!formData.PESSOA) missingFields.push("Tipo de Pessoa");

    if (missingFields.length > 0) {
      toast.error(
        `Por favor, preencha os seguintes campos obrigatórios: ${missingFields.join(", ")}`,
      );
    } else {
      const customerData: CreateCustomerDTO = {
        RAZAO: formData.RAZAO!,
        CPF_CNPJ: formData.CPF_CNPJ!,
        CIDADE: formData.CIDADE!,
        ATIVO: formData.ATIVO!,
        PESSOA: formData.PESSOA!,
        FANTASIA: formData.FANTASIA!,
        COD_ERP: formData.COD_ERP || "",
      };

      customersService.createCustomer(customerData).then(() => {
        toast.success("Cliente cadastrado com sucesso!");
        onClose();
      });
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
            Cadastrar Cliente
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
            <Close />
          </IconButton>
          <div className="flex w-full flex-row justify-center gap-4">
            <TextField
              fullWidth
              label="Razão Social"
              name="razao"
              type="text"
              id="razao"
              required
              onChange={(e) => {
                formData = { ...formData, RAZAO: e.target.value };
              }}
            />
            <TextField
              fullWidth
              label="Fantasia"
              name="fantasy"
              type="text"
              id="fantasy"
              onChange={(e) => {
                formData = { ...formData, FANTASIA: e.target.value };
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
                formData = { ...formData, CPF_CNPJ: e.target.value.trim() };
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
                formData = { ...formData, CIDADE: e.target.value };
              }}
            />
            <TextField
              label="ERP"
              name="erp"
              type="text"
              fullWidth
              onChange={(e) => {
                formData = { ...formData, COD_ERP: e.target.value ?? "" };
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
                formData = { ...formData, ATIVO: e.target.value as "SIM" | "NAO" };
              }}
            >
              <MenuItem value={"SIM"} key="SIM">
                Sim
              </MenuItem>
              <MenuItem value={"NAO"} key="NAO">
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
                formData = { ...formData, PESSOA: e.target.value as "FIS" | "JUR" };
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

            <Button onClick={handleSubmit}>Cadastrar</Button>
          </div>
        </div>
      </FormControl>
    </Dialog>
  );
}
