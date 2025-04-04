"use client"
import { useContext } from "react";
import { FormWrapper } from "./form-wrapper";
import { FormControl, MenuItem, Select } from "@mui/material";
import { UsersContext } from "../context";
import { UserRole } from "@in.pulse-crm/sdk";
import { StyledInputLabel, StyledSelect, StyledTextField } from "./form-styles";
import { FieldWrapper } from "./field-wrapper";

export default function FormGeral() {
    const { changeFormField, form } = useContext(UsersContext);
    const opcoesNivel = { "Ativo": "ATIVO", "Receptivo": "RECEP", "Ambos": "AMBOS", "Supervisor": "ADMIN" };
    const opcoesSetor = { setor1: 1, setor2: 2, setor3: 3 };

    return (
        <FormWrapper>
            <FieldWrapper>
                <StyledTextField
                    label="Nome"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    onChange={(e) => changeFormField("NOME", e.target.value)}
                />
                <StyledTextField
                    label="Login"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    onChange={(e) => changeFormField("LOGIN", e.target.value)}
                />
            </FieldWrapper>
            <FieldWrapper>
                <StyledTextField
                    label="Email"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    type="email"
                    onChange={(e) => changeFormField("EMAIl", e.target.value)}
                />
                <StyledTextField
                    label="Senha"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    type="password"
                    onChange={(e) => changeFormField("SENHA", e.target.value)}
                />
            </FieldWrapper>
            <FieldWrapper>
                <StyledTextField
                    label="Nome de exibição"
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={(e) => changeFormField("NOME_EXIBICAO", e.target.value)}
                />
                <StyledTextField
                    label="Email de exibição"
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={(e) => changeFormField("EMAIL_EXIBICAO", e.target.value)}
                />
            </FieldWrapper>
            <FieldWrapper>
                <StyledTextField
                    label="Assinatura email"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    onChange={(e) => changeFormField("ASSINATURA_EMAIL", e.target.value)}
                />
                <div className="w-[100%] justify-between">select horario</div>
                {/* <FormControl fullWidth >
                <StyledInputLabel>Horario</StyledInputLabel>
                <Select
                    value={horario}
                    onChange={(value) => updateFields({ horario: value.target.value })}
                    sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'gray',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                            color: 'white',
                        }
                    }}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                backgroundColor: '#333',
                                '& .MuiMenuItem-root': {
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#555',
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: '#666',
                                    }
                                }
                            }
                        }
                    }}
                >
                    {Object.entries(opcoesHorario).map(([key, value]) => (
                        <MenuItem key={key} value={key} sx={{ color: 'white' }} >
                            {value}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl> */}
            </FieldWrapper>
            <FieldWrapper>
                <FormControl fullWidth >
                    <StyledInputLabel>Nível</StyledInputLabel>
                    <StyledSelect
                        label="Nível"
                        value={form.NIVEL}
                        size="small"
                        required
                        onChange={(e) => changeFormField("NIVEL", e.target.value as UserRole)}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    backgroundColor: '#333',
                                    '& .MuiMenuItem-root': {
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#555',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: '#666',
                                        }
                                    }
                                }
                            }
                        }}
                    >
                        {Object.entries(opcoesNivel).map(([key, value]) => (
                            <MenuItem key={key} value={key} sx={{ color: 'white' }}>
                                {value}
                            </MenuItem>
                        ))}
                    </StyledSelect>
                </FormControl>
                <FormControl fullWidth >
                    <StyledInputLabel>Setor</StyledInputLabel>
                    <Select
                        label="Setor"
                        value={form.SETOR}
                        size="small"
                        required
                        onChange={(e) => changeFormField("SETOR", Number(e.target.value))}
                        sx={{
                            color: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'gray',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'white',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'white',
                            },
                            '& .MuiSvgIcon-root': {
                                color: 'white',
                            }
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    backgroundColor: '#333',
                                    '& .MuiMenuItem-root': {
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#555',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: '#666',
                                        }
                                    }
                                }
                            }
                        }}
                    >
                        {Object.entries(opcoesSetor).map(([key, value]) => (
                            <MenuItem key={key} value={key} sx={{ color: 'white' }}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </FieldWrapper>
            <StyledTextField
                label="Código ERP"
                variant="outlined"
                fullWidth
                size="small"
                onChange={(e) => changeFormField("CODIGO_ERP", e.target.value)}
            />
        </FormWrapper>
    );
}