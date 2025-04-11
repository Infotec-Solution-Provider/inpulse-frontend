"use client"
import { Button, FormControl, Tab } from "@mui/material";
import { CreateUserDTO, UpdateUserDTO, User } from "@in.pulse-crm/sdk";
import { useContext, useState } from "react";
import { FaX } from "react-icons/fa6";
import { UsersContext } from "../context";
import FormGeral from "./(modal-forms)/form-geral";
import FormTelefonia from "./(modal-forms)/form-telefonia";
import { StyledDialog, StyledDialogTitle, StyledIconButton, StyledTabs } from "./styles-modal";

interface UserModalProps {
  user?: User;
}

export default function UserModal({ user }: UserModalProps) {
  const { closeModal, createUser, updateUser, modal } = useContext(UsersContext)
  const [formData, setFormData] = useState<Partial<User>>(user || {});
  const [activeTab, setActiveTab] = useState(0);
  const isEdit = !!user;

  const handleFormChange = (newData: Partial<User>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  function handleSubmit() {
    const submittedData: Partial<User> = {
      ...formData,
      EDITA_CONTATOS: formData.EDITA_CONTATOS === undefined ? "NAO" : formData.EDITA_CONTATOS,
      VISUALIZA_COMPRAS: formData.VISUALIZA_COMPRAS === undefined ? "NAO" : formData.VISUALIZA_COMPRAS,
      LIGA_REPRESENTANTE: formData.LIGA_REPRESENTANTE === undefined ? "NAO" : formData.LIGA_REPRESENTANTE,
    };
    isEdit ? updateUser(user.CODIGO, submittedData as UpdateUserDTO) : createUser(submittedData as CreateUserDTO);
  }

  return (
    <StyledDialog
      onClose={closeModal}
      open={!!modal}
      fullWidth
      maxWidth="md"
    >
      <div className="h-[85vh]">
        <FormControl className="w-full h-full">
          <div className="flex h-full w-full flex-col bg-slate-800 p-4 gap-3">
            <div className="sticky top-0 z-30">
              <div className="flex w-full justify-between items-center">
                <StyledDialogTitle>
                  {isEdit ? "Editar Usuário" : "Cadastrar Usuário"}
                </StyledDialogTitle>
                <StyledIconButton aria-label="close" onClick={closeModal}>
                  <FaX />
                </StyledIconButton>
              </div>
              <StyledTabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                className="w-full px-40"
              >
                <Tab label="Informações Gerais" />
                <Tab label="Dados Físicos" />
              </StyledTabs>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
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
            <div className="flex w-full flex-row items-center justify-end gap-4 sticky bottom-0 pt-[1rem] border-t-[2px] border-blue-500">
              <Button color="error" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleSubmit}>
                {isEdit ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </FormControl>
      </div>
    </StyledDialog>
  );
}