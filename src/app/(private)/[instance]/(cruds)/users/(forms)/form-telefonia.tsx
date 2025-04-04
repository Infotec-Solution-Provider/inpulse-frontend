"use client"
import { useContext } from "react";
import { UsersContext } from "../context";
import { FormWrapper } from "./form-wrapper"
import { FormControlLabel, Switch } from "@mui/material"
import { StyledTextField } from "./form-styles";
import { FieldWrapper } from "./field-wrapper";

export default function FormTelefonia() {
    const { changeFormField, form } = useContext(UsersContext);

    return (
        <FormWrapper>
            <FieldWrapper>
                <FormControlLabel
                    label="Edita/insere contatos"
                    control={
                        <Switch
                            name="option1"
                            onChange={(checked) => checked && changeFormField("EDITA_CONTATOS", "SIM")}
                            color="primary"
                        />
                    }
                    labelPlacement="start"
                    className="w-[100%] justify-between"
                />
                <FormControlLabel
                    label="Liga p/ represent"
                    control={
                        <Switch
                            name="option1"
                            onChange={(checked) => checked && changeFormField("LIGA_REPRESENTANTE", "SIM")}
                            color="primary"
                        />
                    }
                    labelPlacement="start"
                    className="w-[100%] justify-between"
                />
            </FieldWrapper>
            <FieldWrapper>
                <FormControlLabel
                    label="Visualiza compras"
                    control={
                        <Switch
                            name="option1"
                            onChange={(checked) => checked && changeFormField("VISUALIZA_COMPRAS", "SIM")}
                            color="primary"
                        />
                    }
                    labelPlacement="start"
                    className="w-[100%] justify-between"
                />
                <div className="w-[100%] justify-between">switch modulo manual</div>
                {/* <FormControlLabel
                    control={
                        <Switch
                            name="option1"
                            onChange={(checked) => checked && changeFormField("MODULO_MANUAL", "SIM")}
                            color="primary"
                        />
                    }
                    label="Módulo manual"
                    labelPlacement="start"
                    className="w-[100%] justify-center"
                /> */}
            </FieldWrapper>
            <FieldWrapper>
                <StyledTextField
                    label="Código telefonia"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    onChange={(e) => changeFormField("CODTELEFONIA", e.target.value)}
                />
                <StyledTextField
                    label="Liga p/ represent. dias"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    type="number"
                    onChange={(e) => changeFormField("LIGA_REPRESENTANTE_DIAS", Number(e.target.value))}
                />
            </FieldWrapper>
            <FieldWrapper>
                <StyledTextField
                    label="Omni"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    type="number"
                    onChange={(e) => changeFormField("OMNI", Number(e.target.value))}
                />
                <StyledTextField
                    label="Limite diário agendamento"
                    variant="outlined"
                    fullWidth
                    size="small"
                    required
                    type="number"
                    onChange={(e) => changeFormField("limite_diario_agendamento", Number(e.target.value))}
                />
            </FieldWrapper>
        </FormWrapper>
    )
}