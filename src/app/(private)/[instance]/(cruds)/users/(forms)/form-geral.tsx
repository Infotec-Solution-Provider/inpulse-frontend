import { MenuItem, TextField } from "@mui/material";
import { CreateUserDTO, UpdateUserDTO, User, UserRole } from "@in.pulse-crm/sdk";
import { useContext } from "react";
import { UsersContext } from "../users-context";
import AvatarInput from "@/lib/components/avatar-input";

interface FormGeralProps {
  formData: Partial<User>;
  onFormChange: (data: CreateUserDTO | UpdateUserDTO) => void;
  onAvatarChange?: (file: File | null) => void;
  initialImage?: string | null;
}

export default function FormGeral({ formData, onFormChange, initialImage, onAvatarChange }: FormGeralProps) {
  const { sectors } = useContext(UsersContext);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-row justify-center gap-4">
        <AvatarInput initialImage={initialImage} onChange={onAvatarChange} />
        <div className="flex flex-grow flex-col gap-4">
          <TextField
            label="Nome"
            name="NOME"
            id="NOME"
            type="text"
            fullWidth
            required
            value={formData.NOME}
            onChange={(e) => onFormChange({ NOME: e.target.value })}
          />
          <TextField
            label="Login"
            name="LOGIN"
            id="LOGIN"
            type="text"
            fullWidth
            required
            value={formData.LOGIN}
            onChange={(e) => onFormChange({ LOGIN: e.target.value })}
          />
        </div>
      </div>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          label="Email"
          name="EMAIL"
          id="EMAIL"
          type="email"
          fullWidth
          size="small"
          value={formData.EMAIL || ""}
          onChange={(e) => onFormChange({ EMAIL: e.target.value })}
        />
        <TextField
          label="Senha"
          name="SENHA"
          id="SENHA"
          type="password"
          fullWidth
          size="small"
          required
          value={formData.SENHA}
          onChange={(e) => onFormChange({ SENHA: e.target.value })}
        />
      </div>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          label="Setor"
          name="SETOR"
          id="SETOR"
          select
          fullWidth
          size="small"
          required
          value={formData.SETOR || ""}
          onChange={(e) => onFormChange({ SETOR: Number(e.target.value) })}
        >
          {sectors?.map((sector) => (
            <MenuItem value={sector.id} key={sector.id}>
              {sector.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Nível"
          name="NIVEL"
          select
          fullWidth
          size="small"
          required
          defaultValue={""}
          value={formData.NIVEL}
          onChange={(e) => onFormChange({ NIVEL: e.target.value as UserRole })}
        >
          <MenuItem value={"ADMIN"} key="ADMIN">
            Supervisor
          </MenuItem>
          <MenuItem value={"ATIVO"} key="ATIVO">
            Usuário (Ativo)
          </MenuItem>
          <MenuItem value={"RECEP"} key="RECEP">
            Usuário (Recep)
          </MenuItem>
          <MenuItem value={"AMBOS"} key="AMBOS">
            Usuário (Ambos)
          </MenuItem>
        </TextField>
      </div>
      <div className="flex w-full flex-row justify-center gap-4">
        <TextField
          label="Código ERP"
          name="CODIGO_ERP"
          type="text"
          fullWidth
          size="small"
          value={formData.CODIGO_ERP || ""}
          onChange={(e) => onFormChange({ CODIGO_ERP: e.target.value })}
        />
        <TextField
          label="Whatsapp"
          name="WHATSAPP"
          id="WHATSAPP"
          fullWidth
          size="small"
          value={formData.WHATSAPP || ""}
          onChange={(e) => onFormChange({ WHATSAPP: e.target.value })}
        />
      </div>
    </div>
  );
}
