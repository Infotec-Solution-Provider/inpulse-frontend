"use client";
import { ChatsReportFormat } from "@in.pulse-crm/sdk";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { FormEventHandler, useCallback, useContext, useState } from "react";
import { ChatsReportContext, GenerateReportParams } from "./chats-reports-context";
import { Autocomplete, Button, MenuItem, TextField } from "@mui/material";

export default function ChatReportForm() {
  const { users, generateReport } = useContext(ChatsReportContext);

  const [formData, setFormData] = useState<GenerateReportParams>({
    format: "pdf",
    userId: "*",
    startDate: "",
    endDate: "",
  });

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (e) => {
      e.preventDefault();
      generateReport(formData);
    },
    [formData, generateReport],
  );

  return (
    <form
      className="flex items-center gap-3 bg-indigo-700/5 px-4 py-4 text-xs shadow-md"
      onSubmit={handleSubmit}
    >
      <TextField
        className="w-32"
        select
        onChange={(e) => setFormData({ ...formData, format: e.target.value as ChatsReportFormat })}
        label="Formato"
        required
        size="small"
        defaultValue={formData.format}
      >
        <MenuItem value="txt">TXT</MenuItem>
        <MenuItem value="pdf">PDF</MenuItem>
        <MenuItem value="csv">CSV</MenuItem>
      </TextField>

      <Autocomplete
        className="w-96"
        size="small"
        options={[
          ...users.map((u) => ({ label: u.NOME, value: String(u.CODIGO) })),
          { label: "Todos", value: "*" },
        ]}
        getOptionKey={(option) => option.value}
        value={
          [
            ...users.map((u) => ({ label: u.NOME, value: String(u.CODIGO) })),
            { label: "Todos", value: "*" },
          ].find((opt) => opt.value === formData.userId) || { label: "Todos", value: "*" }
        }
        onChange={(_, option) => {
          setFormData({ ...formData, userId: option?.value ?? "*" });
        }}
        renderInput={(params) => <TextField {...params} label="Usuário" />}
      />

      <div className="ml-4 flex items-center gap-2">
        <TextField
          className="w-52"
          type="date"
          size="small"
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        />
        <ArrowRightAltIcon />
        <TextField
          className="w-52"
          size="small"
          type="date"
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        />
      </div>
      <div className="ml-auto">
        <Button title="Exportar" type="submit" variant="outlined" size="small">
          Exportar
        </Button>
      </div>
    </form>
  );
}
