"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Close } from "@mui/icons-material";
import { Autocomplete, Button, Chip, IconButton, TextField } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useContactsContext } from "../../contacts-context";

interface ContactModalProps {
  contact?: WppContact & { customerId?: number; customer?: Customer };
}

export default function ContactModal({ contact }: ContactModalProps) {
  const { createContact, updateContact } = useContactsContext();
  const { closeModal } = useAppContext();
  const { sectors } = useContext(WhatsappContext);
  const isEditMode = !!contact;

  const [name, setName] = useState(contact?.name || "");
  const [phone, setPhone] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<Array<{ id: number; name: string }>>([]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("O nome é obrigatório!");
      return;
    }

    if (isEditMode) {
      updateContact(
        contact.id,
        name,
        selectedSectors.map((s) => s.id),
      );
    } else {
      if (!phone.trim()) {
        toast.error("O telefone é obrigatório!");
        return;
      }

      const cleanedPhone = phone.replace(/\D/g, "");
      if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
        toast.error("Telefone inválido! Use o formato: 5511999999999");
        return;
      }

      createContact(
        name,
        cleanedPhone,
        selectedSectors.map((s) => s.id),
      );
    }
  };

  useEffect(() => {
    if (contact?.sectors) {
      setSelectedSectors(
        contact.sectors.map((s) => {
          return {
            id: s.sectorId,
            name: sectors?.find((sec) => sec.id === s.sectorId)?.name || "",
          };
        }),
      );
    }
  }, [contact, sectors]);

  return (
    <div className="w-full max-w-md rounded-lg bg-slate-100 p-6 shadow-xl dark:bg-slate-800">
      <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {isEditMode ? "Editar Contato" : "Cadastrar Contato"}
        </h1>
        <IconButton
          onClick={closeModal}
          className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Close />
        </IconButton>
      </header>

      <div className="mb-6 flex w-80 flex-col gap-4">
        <TextField
          label="Nome"
          placeholder="João Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          autoFocus
          required
          variant="outlined"
          className="bg-slate-50 dark:bg-slate-700"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(248 250 252)",
            },
          }}
        />

        {!isEditMode && (
          <TextField
            label="WhatsApp"
            placeholder="5511999999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            fullWidth
            required
            variant="outlined"
            className="bg-slate-50 dark:bg-slate-700"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(248 250 252)",
              },
            }}
          />
        )}

        <Autocomplete
          multiple
          options={sectors || []}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedSectors}
          onChange={(e, newValue) => setSelectedSectors(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Setores"
              placeholder="Selecione setores..."
              variant="outlined"
              className="bg-slate-50 dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(248 250 252)",
                },
              }}
            />
          )}
          renderValue={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                variant="outlined"
                size="small"
              />
            ))
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: "8px 8px",
            },
          }}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button onClick={closeModal} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!name.trim() || (!isEditMode && !phone.trim())}
        >
          {isEditMode ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </div>
  );
}
