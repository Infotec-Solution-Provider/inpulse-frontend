"use client"
import { Button, Dialog, DialogTitle, FormControl, IconButton, Tab, Tabs } from "@mui/material";
import { User } from "@in.pulse-crm/sdk";
import { useEffect, useState } from "react";
import { FaX } from "react-icons/fa6";
import FormGeral from "./(forms)/form-geral";
import FormTelefonia from "./(forms)/form-telefonia";

export interface SimpleDialogProps {
  open: boolean;
  user: Partial<User>;
  onClose: (value: Partial<User>) => void;
}

export default function UsersModal({ onClose, user, open }: SimpleDialogProps) {
  const [formData, setFormData] = useState<Partial<User>>(user);
  const [activeTab, setActiveTab] = useState(0);
  const isEdit = !!user.CODIGO;

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleFormChange = (newData: Partial<User>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  function handleClose() {
    onClose(user);
  }

  function handleSubmit() {
    const submittedData: Partial<User> = {
      NOME: formData.NOME,
      LOGIN: formData.LOGIN,
      EMAIL: formData.EMAIL,
      SENHA: formData.SENHA,
      HORARIO: formData.HORARIO,
      NIVEL: formData.NIVEL,
      CODIGO_ERP: formData.CODIGO_ERP,
      SETOR: formData.SETOR,
      ////////////////////
      EDITA_CONTATOS: formData.EDITA_CONTATOS === undefined ? "NAO" : formData.EDITA_CONTATOS,
      VISUALIZA_COMPRAS: formData.VISUALIZA_COMPRAS === undefined ? "NAO" : formData.VISUALIZA_COMPRAS,
      LIGA_REPRESENTANTE: formData.LIGA_REPRESENTANTE === undefined ? "NAO" : formData.LIGA_REPRESENTANTE,
      LIGA_REPRESENTANTE_DIAS: formData.LIGA_REPRESENTANTE_DIAS,
      CODTELEFONIA: formData.CODTELEFONIA,
      OMNI: formData.OMNI,
      limite_diario_agendamento: formData.limite_diario_agendamento,
      /////////////////
      NOME_EXIBICAO: formData.NOME_EXIBICAO,
      EMAIL_EXIBICAO: formData.EMAIL_EXIBICAO,
      ASSINATURA_EMAIL: formData.ASSINATURA_EMAIL,
    };

    if (isEdit) {
      onClose({ ...submittedData, CODIGO: user.CODIGO });
    } else {
      onClose(submittedData);
    }
  }

  return (
    <Dialog onClose={handleClose} open={open} fullWidth maxWidth="md">
      <FormControl>
        <div className="flex h-full w-full flex-col items-center gap-4 bg-slate-800 p-4">
          <div className="flex w-full justify-between items-center">
            <DialogTitle sx={{ paddingLeft: 0.5, paddingTop: 0 }}>
              {isEdit ? "Editar Usuário" : "Cadastrar Usuário"}
            </DialogTitle>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={(theme) => ({
                fontSize: 18,
                color: theme.palette.primary.light,
              })}
            >
              <FaX />
            </IconButton>
          </div>

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            className="w-full"
          >
            <Tab label="Informações Gerais" />
            <Tab label="Dados Físicos" />
          </Tabs>

          <div className="w-full h-full">
            {activeTab === 0 && (
              <FormGeral
                formData={formData}
                onFormChange={handleFormChange}
              />
            )}
            {activeTab === 1 && (
              <FormTelefonia
                formData={formData}
                onFormChange={handleFormChange}
              />
            )}
          </div>

          <div className="flex w-full flex-row items-center justify-end gap-4 mt-4">
            <Button color="error" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      </FormControl>
    </Dialog>
  );
}