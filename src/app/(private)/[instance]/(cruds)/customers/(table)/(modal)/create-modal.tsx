import {
  Button,
  Dialog,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import { Client } from "../../type";
import { FaX } from "react-icons/fa6";

export interface CreateModalProps {
  open: boolean;
  onClose: () => void;
}

let formData: Partial<Client> = {};

export default function CreateModal({ onClose, open }: CreateModalProps) {
  function handleClose() {
    onClose();
  }

  function handleSubmit() {
    console.log(formData);
  }

  return (
    <Dialog onClose={handleClose} open={open}>
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
            <FaX />
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
                formData = { ...formData, name: e.target.value };
              }}
            />
            <TextField
              fullWidth
              label="Fantasia"
              name="fantasy"
              type="text"
              id="fantasy"
              onChange={(e) => {
                formData = { ...formData, fantasy: e.target.value };
              }}
            />
          </div>
          <div className="flex flex-row justify-center gap-4">
            <TextField
              label="CPF"
              name="cpf"
              type="text"
              id="cpf"
              fullWidth
              required
              onChange={(e) => {
                formData = { ...formData, cpf: e.target.value };
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
                formData = { ...formData, city: e.target.value };
              }}
            />
            <TextField
              label="ERP"
              name="erp"
              type="text"
              fullWidth
              onChange={(e) => {
                formData = { ...formData, erp: e.target.value };
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
                formData = { ...formData, active: e.target.value === "true" };
              }}
            >
              <MenuItem value={"true"} key="true">
                Sim
              </MenuItem>
              <MenuItem value={"false"} key="false">
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
                formData = { ...formData, personType: e.target.value as string };
              }}
            >
              <MenuItem value="FISICA" key="FISICA">
                Física
              </MenuItem>
              <MenuItem value="JURIDICA" key="JURIDICA">
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
