import { MenuItem } from "@mui/material";
import { CreateUserDTO, UpdateUserDTO, User, UserRole } from "@in.pulse-crm/sdk";
import { selectSlotProps, StyledTextField } from "./styles-form";
import { WhatsappContext } from "../../../whatsapp-context";
import { useContext, useEffect, useState } from "react";

interface FormGeralProps {
  formData: Partial<User>;
  onFormChange: (data: CreateUserDTO | UpdateUserDTO) => void;
}

export default function FormGeral({ formData, onFormChange }: FormGeralProps) {
  const { wppApi } = useContext(WhatsappContext);
  const [sectors, setSectors] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (wppApi.current) {
      wppApi.current.getSectors().then((data) => {
        setSectors(data);
      });
    }
  }, [wppApi]);

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
      {/*             <div className="flex w-full flex-row justify-center gap-4">
                <StyledTextField
                    label="Nome de exibição"
                    name="NOME_EXIBICAO"
                    type="text"
                    fullWidth
                    size="small"
                    value={formData.NOME_EXIBICAO}
                    onChange={(e) => onFormChange({ NOME_EXIBICAO: e.target.value })}
                />
                <StyledTextField
                    label="Email de exibição"
                    name="EMAIL_EXIBICAO"
                    type="text"
                    fullWidth
                    size="small"
                    value={formData.EMAIL_EXIBICAO}
                    onChange={(e) => onFormChange({ EMAIL_EXIBICAO: e.target.value })}
                />
            </div> */}
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
            Ativo
          </MenuItem>
          <MenuItem value={"RECEP"} key="RECEP">
            Recepcivo
          </MenuItem>
          <MenuItem value={"AMBOS"} key="AMBOS">
            Ambos
          </MenuItem>
        </StyledTextField>
        {/*                 <StyledTextField
                    label="Horário"
                    name="HORARIO"
                    select
                    fullWidth
                    size="small"
                    defaultValue={""}
                    value={formData.HORARIO}
                    onChange={(e) => onFormChange({ HORARIO: Number(e.target.value) })}
                    slotProps={selectSlotProps}
                >
                    <MenuItem value={"1"} key="MANHA">
                        Manhã
                    </MenuItem>
                    <MenuItem value={"2"} key="TARDE">
                        Tarde
                    </MenuItem>
                    <MenuItem value={"3"} key="INTEGRAL">
                        Integral
                    </MenuItem>
                </StyledTextField> */}
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
