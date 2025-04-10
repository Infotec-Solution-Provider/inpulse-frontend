import { TextField, MenuItem } from "@mui/material";
import { User, UserRole } from "@in.pulse-crm/sdk";

interface FormGeralProps {
    formData: Partial<User>;
    onFormChange: (data: Partial<User>) => void;
}

export default function FormGeral({ formData, onFormChange }: FormGeralProps) {

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex w-full flex-row justify-center gap-4">
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
            <div className="flex w-full flex-row justify-center gap-4">
                <TextField
                    label="Email"
                    name="EMAIL"
                    id="EMAIL"
                    type="email"
                    fullWidth
                    required
                    value={formData.EMAIL}
                    onChange={(e) => onFormChange({ EMAIL: e.target.value })}
                />
                <TextField
                    label="Senha"
                    name="SENHA"
                    id="SENHA"
                    type="password"
                    fullWidth
                    required
                    value={formData.SENHA}
                    onChange={(e) => onFormChange({ SENHA: e.target.value })}
                />
            </div>
            <div className="flex w-full flex-row justify-center gap-4">
                <TextField
                    label="Nome de exibição"
                    name="NOME_EXIBICAO"
                    type="text"
                    fullWidth
                    value={formData.NOME_EXIBICAO}
                    onChange={(e) => onFormChange({ NOME_EXIBICAO: e.target.value })}
                />
                <TextField
                    label="Email de exibição"
                    name="EMAIL_EXIBICAO"
                    type="text"
                    fullWidth
                    value={formData.EMAIL_EXIBICAO}
                    onChange={(e) => onFormChange({ EMAIL_EXIBICAO: e.target.value })}
                />
            </div>
            <div className="flex w-full flex-row justify-center gap-4">
                <TextField
                    label="Assinatura email"
                    name="ASSINATURA_EMAIL"
                    type="text"
                    fullWidth
                    value={formData.ASSINATURA_EMAIL}
                    onChange={(e) => onFormChange({ ASSINATURA_EMAIL: e.target.value })}
                />
                <TextField
                    label="Código ERP"
                    name="CODIGO_ERP"
                    type="text"
                    fullWidth
                    required
                    value={formData.CODIGO_ERP}
                    onChange={(e) => onFormChange({ CODIGO_ERP: e.target.value })}
                />
            </div>
            <div className="flex w-full flex-row justify-center gap-4">
                <TextField
                    label="Setor"
                    name="SETOR"
                    id="SETOR"
                    select
                    fullWidth
                    required
                    value={formData.SETOR}
                    onChange={(e) => onFormChange({ SETOR: Number(e.target.value) })}
                >
                    <MenuItem value="1" key="Setor1">
                        Setor 1
                    </MenuItem>
                    <MenuItem value="2" key="Setor2">
                        Setor 2
                    </MenuItem>
                    <MenuItem value="3" key="Setor3">
                        Setor 3
                    </MenuItem>
                    <MenuItem value="4" key="Setor4">
                        Setor 4
                    </MenuItem>
                </TextField>
                <TextField
                    label="Nível"
                    name="NIVEL"
                    select
                    fullWidth
                    required
                    value={formData.NIVEL}
                    onChange={(e) => onFormChange({ NIVEL: e.target.value as UserRole })}
                >
                    <MenuItem value={"ADMIN"} key="ADMIN">
                        Admin
                    </MenuItem>
                    <MenuItem value={"ATIVO"} key="ATIVO">
                        Ativo
                    </MenuItem>
                    <MenuItem value={"RECEP"} key="RECEP">
                        Recepcionista
                    </MenuItem>
                    <MenuItem value={"AMBOS"} key="AMBOS">
                        Ambos
                    </MenuItem>
                </TextField>
                <TextField
                    label="Horário"
                    name="HORARIO"
                    select
                    fullWidth
                    value={formData.HORARIO}
                    onChange={(e) => onFormChange({ HORARIO: Number(e.target.value) })}
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
                </TextField>
            </div>
        </div>
    );
}  