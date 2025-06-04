"use client";
import { Button, DialogTitle, FormControl } from "@mui/material";
import { CreateUserDTO, FileDirType, UpdateUserDTO, User, UserRole } from "@in.pulse-crm/sdk";
import { useContext, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { UsersContext } from "../users-context";
import FormGeral from "../(forms)/form-geral";
import { StyledDialog, StyledIconButton } from "./styles-modal";
import filesService from "@/lib/services/files.service";
import { useAuthContext } from "@/app/auth-context";

interface UserModalProps {
  user?: User;
}

export default function UserModal({ user }: UserModalProps) {
  const { instance } = useAuthContext();
  const { closeModal, createUser, updateUser, modal } = useContext(UsersContext);
  const [formData, setFormData] = useState<CreateUserDTO>({
    NOME: user ? user.NOME : "",
    LOGIN: user ? user.LOGIN : "",
    EMAIL: user ? user.EMAIL || "" : undefined,
    WHATSAPP: user ? user.WHATSAPP || "" : undefined,
    SENHA: user ? user.SENHA! : "",
    SETOR: user ? user.SETOR : null!,
    NIVEL: user ? (user.NIVEL as UserRole) : ("" as UserRole),
    CODIGO_ERP: user ? user.CODIGO_ERP : null!,
    AVATAR_ID: user ? user.AVATAR_ID : null,
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  /* const [activeTab, setActiveTab] = useState(0); */
  const isEdit = !!user;
  const initialImage = user?.AVATAR_ID ? filesService.getFileDownloadUrl(user.AVATAR_ID) : null;

  const handleFormChange = (newData: CreateUserDTO | UpdateUserDTO) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleAvatarChange = (file: File | null) => {
    console.log("avatar", file);
    setAvatar(file);
  };

  async function handleSubmit() {
    let AVATAR_ID: number | null = null;
    if (avatar) {
      const arrayBuffer = await avatar.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileResult = await filesService.uploadFile({
        buffer: buffer,
        fileName: avatar.name,
        dirType: FileDirType.PUBLIC,
        instance: instance,
        mimeType: avatar.type,
      });

      AVATAR_ID = fileResult.id;
    }

    if (isEdit) {
      updateUser(user.CODIGO, { ...formData, AVATAR_ID });
    } else {
      createUser({ ...formData, AVATAR_ID });
    }
  }

  return (
    <StyledDialog
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          closeModal();
        }
      }}
      open={!!modal}
      fullWidth
      maxWidth="md"
    >
      <div className="max-h-[85vh]">
        <FormControl className="h-full w-full">
          <div className="flex h-full w-full flex-col gap-3 bg-white dark:bg-slate-800 p-4">
            <div className="sticky top-0 z-30">
              <div className="flex w-full items-center justify-between">
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
            <div className="flex-1 scrollbar-whatsapp py-2">
              <FormGeral
                formData={formData}
                initialImage={initialImage}
                onFormChange={handleFormChange}
                onAvatarChange={handleAvatarChange}
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
