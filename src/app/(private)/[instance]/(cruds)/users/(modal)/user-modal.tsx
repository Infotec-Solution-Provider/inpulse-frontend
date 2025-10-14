"use client";
import { useAuthContext } from "@/app/auth-context";
import AvatarInput from "@/lib/components/avatar-input";
import filesService from "@/lib/services/files.service";
import { CreateUserDTO, FileDirType, User, UserRole } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Button, Dialog, IconButton, InputAdornment, MenuItem, TextField } from "@mui/material";
import { useState } from "react";
import { useUsersContext } from "../users-context";

interface UserModalProps {
  user?: User;
}

export default function UserModal({ user }: UserModalProps) {
  const { instance } = useAuthContext();
  const { closeModal, createUser, updateUser, modal, sectors } = useUsersContext();
  const [formData, setFormData] = useState<CreateUserDTO>({
    NOME: user?.NOME || "",
    LOGIN: user?.LOGIN || "",
    EMAIL: user?.EMAIL || "",
    WHATSAPP: user?.WHATSAPP || "",
    SENHA: user?.SENHA || "",
    SETOR: user?.SETOR || null!,
    NIVEL: (user?.NIVEL as UserRole) || ("" as UserRole),
    CODIGO_ERP: user?.CODIGO_ERP || "",
    AVATAR_ID: user?.AVATAR_ID || null,
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!user;
  const initialImage = user?.AVATAR_ID ? filesService.getFileDownloadUrl(user.AVATAR_ID) : null;

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  async function handleSubmit() {
    try {
      let AVATAR_ID: number | null = user?.AVATAR_ID ?? null;

      if (avatar) {
        const arrayBuffer = await avatar.arrayBuffer();
        const buffer =
          typeof Buffer !== "undefined" ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer);

        const uploaded = await filesService.uploadFile({
          buffer: buffer as any,
          fileName: avatar.name,
          dirType: FileDirType.PUBLIC,
          instance: instance,
          mimeType: avatar.type,
        });

        AVATAR_ID = uploaded.id;
      }

      if (isEdit) {
        await updateUser(user!.CODIGO, { ...formData, AVATAR_ID });
      } else {
        await createUser({ ...formData, AVATAR_ID });
      }
    } catch (err) {
      console.error("Erro no handleSubmit:", err);
    }
  }

  return (
    <Dialog
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          closeModal();
        }
      }}
      open={!!modal}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: "rounded-lg",
      }}
    >
      <div className="flex flex-col bg-white dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          <IconButton
            onClick={closeModal}
            size="small"
            className="text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <CloseIcon />
          </IconButton>
        </div>

        {/* Body - Formulário Inline */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="flex w-full flex-col gap-6">
            {/* Avatar e Credenciais (Login e Senha) */}
            <div className="flex w-full flex-col items-center gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-700 md:flex-row">
              <div className="flex-shrink-0">
                <AvatarInput initialImage={initialImage} onChange={setAvatar} />
              </div>
              <div className="grid w-full flex-1 gap-4 md:grid-cols-2">
                <TextField
                  label="Login"
                  name="LOGIN"
                  type="text"
                  fullWidth
                  required
                  value={formData.LOGIN}
                  onChange={(e) => handleFormChange("LOGIN", e.target.value)}
                  className="bg-white dark:bg-slate-600"
                />
                <TextField
                  label="Senha"
                  name="SENHA"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required
                  value={formData.SENHA}
                  onChange={(e) => handleFormChange("SENHA", e.target.value)}
                  className="bg-white dark:bg-slate-600"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </div>
            </div>

            {/* Informações Pessoais */}
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Nome Completo"
                name="NOME"
                type="text"
                fullWidth
                required
                value={formData.NOME}
                onChange={(e) => handleFormChange("NOME", e.target.value)}
                className="bg-white dark:bg-slate-700"
              />
              <TextField
                label="Email"
                name="EMAIL"
                type="email"
                fullWidth
                value={formData.EMAIL || ""}
                onChange={(e) => handleFormChange("EMAIL", e.target.value)}
                className="bg-white dark:bg-slate-700"
              />
            </div>

            {/* Organização */}
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Setor"
                name="SETOR"
                select
                fullWidth
                required
                value={formData.SETOR || ""}
                onChange={(e) => handleFormChange("SETOR", Number(e.target.value))}
                className="bg-white dark:bg-slate-700"
              >
                {sectors?.map((sector: { id: number; name: string }) => (
                  <MenuItem value={sector.id} key={sector.id}>
                    {sector.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Nível de Acesso"
                name="NIVEL"
                select
                fullWidth
                required
                value={formData.NIVEL || ""}
                onChange={(e) => handleFormChange("NIVEL", e.target.value as UserRole)}
                className="bg-white dark:bg-slate-700"
              >
                <MenuItem value="ADMIN">Administrador</MenuItem>
                <MenuItem value="ATIVO">Usuário (Ativo)</MenuItem>
                <MenuItem value="RECEP">Usuário (Recep)</MenuItem>
                <MenuItem value="AMBOS">Usuário (Ambos)</MenuItem>
              </TextField>
            </div>

            {/* Informações Complementares */}
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Código ERP"
                name="CODIGO_ERP"
                type="text"
                fullWidth
                value={formData.CODIGO_ERP || ""}
                onChange={(e) => handleFormChange("CODIGO_ERP", e.target.value)}
                className="bg-white dark:bg-slate-700"
              />
              <TextField
                label="WhatsApp"
                name="WHATSAPP"
                fullWidth
                value={formData.WHATSAPP || ""}
                onChange={(e) => handleFormChange("WHATSAPP", e.target.value)}
                className="bg-white dark:bg-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <Button
            onClick={closeModal}
            variant="outlined"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<SaveIcon />}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            sx={{ textTransform: "none", fontWeight: 600, paddingX: 3 }}
          >
            {isEdit ? "Salvar Alterações" : "Cadastrar Usuário"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
