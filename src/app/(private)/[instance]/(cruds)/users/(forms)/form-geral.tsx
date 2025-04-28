import { MenuItem } from "@mui/material";
import { CreateUserDTO, UpdateUserDTO, User, UserRole } from "@in.pulse-crm/sdk";
import { selectSlotProps, StyledTextField } from "./styles-form";
import { useContext } from "react";
import { UsersContext } from "../users-context";

interface FormGeralProps {
  formData: Partial<User>;
  onFormChange: (data: CreateUserDTO | UpdateUserDTO) => void;
}

export default function FormGeral({ formData, onFormChange }: FormGeralProps) {
  const { sectors } = useContext(UsersContext);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-row justify-center gap-4">
        <StyledTextField
          label="Nome"
          name="NOME"
          id="NOME"
          type="text"
          fullWidth
          size="small"
          required
          value={formData.NOME}
          onChange={(e) => onFormChange({ NOME: e.target.value })}
        />
        <StyledTextField
          label="Login"
          name="LOGIN"
          id="LOGIN"
          type="text"
          fullWidth
          size="small"
          required
          value={formData.LOGIN}
          onChange={(e) => onFormChange({ LOGIN: e.target.value })}
        />
      </div>
      <div className="flex w-full flex-row justify-center gap-4">
        <StyledTextField
          label="Email"
          name="EMAIL"
          id="EMAIL"
          type="email"
          fullWidth
          size="small"
          value={formData.EMAIL || ""}
          onChange={(e) => onFormChange({ EMAIL: e.target.value })}
        />
        <StyledTextField
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
        <StyledTextField
          label="Setor"
          name="SETOR"
          id="SETOR"
          select
          fullWidth
          size="small"
          required
          value={formData.SETOR || ""}
          onChange={(e) => onFormChange({ SETOR: Number(e.target.value) })}
          slotProps={selectSlotProps}
        >
          {sectors.map((sector) => (
            <MenuItem value={sector.id} key={sector.id}>
              {sector.name}
            </MenuItem>
          ))}
        </StyledTextField>
        <StyledTextField
          label="Nível"
          name="NIVEL"
          select
          fullWidth
          size="small"
          required
          defaultValue={""}
          value={formData.NIVEL}
          onChange={(e) => onFormChange({ NIVEL: e.target.value as UserRole })}
          slotProps={selectSlotProps}
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
        </StyledTextField>
      </div>
      <div className="flex w-1/2 flex-row justify-center gap-4 pr-2">
        <StyledTextField
          label="Código ERP"
          name="CODIGO_ERP"
          type="text"
          fullWidth
          size="small"
          value={formData.CODIGO_ERP || ""}
          onChange={(e) => onFormChange({ CODIGO_ERP: e.target.value })}
        />
      </div>
    </div>
  );
}
