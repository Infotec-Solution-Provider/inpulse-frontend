"use client"
import { Button, DialogTitle, FormControl, Tab } from "@mui/material";
import { CreateUserDTO, UpdateUserDTO, User, UserRole } from "@in.pulse-crm/sdk";
import { useContext, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import { UsersContext } from "../context";
import FormGeral from "../(forms)/form-geral";
import FormTelefonia from "../(forms)/form-telefonia";
import { StyledDialog, StyledDialogTitle, StyledIconButton, StyledTabs } from "./styles-modal";

interface UserModalProps {
  user?: User;
}

export default function UserModal({ user }: UserModalProps) {
  const { closeModal, createUser, updateUser, modal } = useContext(UsersContext)
  const [formData, setFormData] = useState<CreateUserDTO>({
    NOME: user ? user.NOME : "",
    LOGIN: user ? user.LOGIN : "",
    EMAIL: user ? user.EMAIL : undefined,
    SENHA: user ? user.SENHA! : "",
    SETOR: user ? user.SETOR : null!,
    NIVEL: user ? user.NIVEL as UserRole : "" as UserRole,
    CODIGO_ERP: user ? user.CODIGO_ERP : null!
  });
  /* const [activeTab, setActiveTab] = useState(0); */
  const isEdit = !!user;

  const handleFormChange = (newData: Partial<User>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  function handleSubmit() {

    isEdit ? updateUser(user.CODIGO, formData) : createUser(formData);
  }

  return (
    <StyledDialog
      onClose={closeModal}
      open={!!modal}
      fullWidth
      maxWidth="md"
    >
      <div className="max-h-[85vh]">
        <FormControl className="w-full h-full">
          <div className="flex h-full w-full flex-col bg-slate-800 p-4 gap-3">
            <div className="sticky top-0 z-30">
              <div className="flex w-full justify-between items-center">
                <DialogTitle sx={{ paddingX: "8px", paddingY: "4px" }}>
                  {isEdit ? "Editar Usuário" : "Cadastrar Usuário"}
                </DialogTitle>
                <StyledIconButton aria-label="close" onClick={closeModal}>
                  <CloseIcon />
                </StyledIconButton>
              </div>
              {/*               <StyledTabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                className="w-full px-40"
              >
                <Tab label="Informações Gerais" />
                <Tab label="Dados Físicos" />
              </StyledTabs> */}
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <FormGeral
                formData={formData}
                onFormChange={handleFormChange}
              />
              {/*               {activeTab === 0 && (
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
              )} */}
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