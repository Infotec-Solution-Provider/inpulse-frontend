"use client";
import { Button, DialogTitle, FormControl } from "@mui/material";
import { CreateInternalGroupDTO, UpdateInternalGroupDTO, InternalGroup, InternalGroupRole } from "@in.pulse-crm/sdk";
import { useContext, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { InternalGroupsContext } from "../context";
import FormGeral from "../(forms)/form-geral";
import { StyledDialog, StyledIconButton } from "./styles-modal";
interface InternalGroupModalProps {
  internalgroup?: InternalGroup;
}

export default function InternalGroupModal({ internalgroup }: InternalGroupModalProps) {
  const { closeModal, createInternalGroup, updateInternalGroup, modal } = useContext(InternalGroupsContext);
  const [formData, setFormData] = useState<CreateInternalGroupDTO>({
    NOME: internalgroup ? internalgroup.NOME : "",
    LOGIN: internalgroup ? internalgroup.LOGIN : "",
    EMAIL: internalgroup ? internalgroup.EMAIL : undefined,
    SENHA: internalgroup ? internalgroup.SENHA! : "",
    SETOR: internalgroup ? internalgroup.SETOR : null!,
    NIVEL: internalgroup ? (internalgroup.NIVEL as InternalGroupRole) : ("" as InternalGroupRole),
    CODIGO_ERP: internalgroup ? internalgroup.CODIGO_ERP : null!,
  });
  /* const [activeTab, setActiveTab] = useState(0); */
  const isEdit = !!internalgroup;

  const handleFormChange = (newData: CreateInternalGroupDTO | UpdateInternalGroupDTO) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  function handleSubmit() {
    if (isEdit) {
      updateInternalGroup(internalgroup.CODIGO, formData);
    } else {
      createInternalGroup(formData);
    }
  }

  return (
    <StyledDialog onClose={closeModal} open={!!modal} fullWidth maxWidth="md">
      <div className="max-h-[85vh]">
        <FormControl className="h-full w-full">
          <div className="flex h-full w-full flex-col gap-3 bg-slate-800 p-4">
            <div className="sticky top-0 z-30">
              <div className="flex w-full items-center justify-between">
                <DialogTitle sx={{ paddingX: "8px", paddingY: "4px" }}>
                  {isEdit ? "Editar Usuário" : "Cadastrar Usuário"}
                </DialogTitle>
                <StyledIconButton aria-label="close" onClick={closeModal}>
                  <CloseIcon />
                </StyledIconButton>
              </div>

            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <FormGeral formData={formData} onFormChange={handleFormChange} />
            </div>
            <div className="sticky bottom-0 flex w-full flex-row items-center justify-end gap-4 border-t-[2px] border-blue-500 pt-[1rem]">
              <Button color="error" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>{isEdit ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </div>
        </FormControl>
      </div>
    </StyledDialog>
  );
}
