"use client";
import { ChatsReportFormat } from "@in.pulse-crm/sdk";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { FormEventHandler, useCallback, useContext, useState } from "react";
import { ChatsReportContext, GenerateReportParams } from "./chats-reports-context";
import { Autocomplete, Button, CircularProgress, MenuItem, TextField } from "@mui/material";

export default function ChatReportForm() {
  const { users, generateReport, isLoading } = useContext(ChatsReportContext);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<GenerateReportParams>({
    format: "pdf",
    userId: "*",
    startDate: "",
    endDate: "",
  });

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.startDate) {
      newErrors.startDate = "Data inicial é obrigatória";
    }
    
    if (!formData.endDate) {
      newErrors.endDate = "Data final é obrigatória";
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = "Data final não pode ser anterior à data inicial";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validate();
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (e) => {
      e.preventDefault();
      
      if (validate()) {
        generateReport(formData);
      }
    },
    [formData, generateReport, validate],
  );

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Se estiver mudando a data inicial e a final for anterior, atualiza a final também
      ...(field === 'startDate' && formData.endDate && new Date(value) > new Date(formData.endDate) 
        ? { endDate: value } 
        : {})
    }));
    
    // Limpa o erro do campo alterado
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form
      className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md dark:bg-gray-800 dark:ring-gray-700 sm:flex-row sm:items-end sm:gap-3"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <TextField
            select
            fullWidth
            label="Formato"
            size="small"
            value={formData.format}
            onChange={(e) => setFormData({ ...formData, format: e.target.value as ChatsReportFormat })}
            variant="outlined"
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="txt">TXT</MenuItem>
          </TextField>
        </div>

        <div className="sm:col-span-1">
          <Autocomplete
            fullWidth
            size="small"
            options={[
              { label: "Todos os usuários", value: "*" },
              ...users.map((u) => ({ 
                label: u.NOME, 
                value: String(u.CODIGO) 
              }))
            ]}
            value={users.find(u => String(u.CODIGO) === formData.userId) 
              ? { 
                  label: users.find(u => String(u.CODIGO) === formData.userId)!.NOME, 
                  value: formData.userId 
                } 
              : { label: "Todos os usuários", value: "*" }
            }
            onChange={(_, value) => {
              setFormData(prev => ({
                ...prev,
                userId: value?.value || "*"
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Usuário"
                variant="outlined"
                size="small"
              />
            )}
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              fullWidth
              type="date"
              label="Data inicial"
              size="small"
              value={formData.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              onBlur={() => handleBlur('startDate')}
              error={touched.startDate && !!errors.startDate}
              helperText={touched.startDate && errors.startDate}
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </div>
          
          <div className="flex items-center justify-center py-2 sm:py-0">
            <ArrowRightAltIcon className="text-gray-400" />
          </div>
          
          <div className="flex-1">
            <TextField
              fullWidth
              type="date"
              label="Data final"
              size="small"
              value={formData.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              onBlur={() => handleBlur('endDate')}
              error={touched.endDate && !!errors.endDate}
              helperText={touched.endDate && errors.endDate}
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </div>
          
          <div className="mt-2 sm:ml-2 sm:mt-0">
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
