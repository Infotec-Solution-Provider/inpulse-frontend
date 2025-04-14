"use client";
import { ChatsReportFormat } from "@in.pulse-crm/sdk";
import SimCardDownloadIcon from "@mui/icons-material/SimCardDownload";
import { FormEventHandler, useCallback, useContext, useState } from "react";
import { ChatsReportContext, GenerateReportParams } from "./context";
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
    [formData],
  );

  return (
    <form
      className="flex items-center gap-3 bg-indigo-700 bg-opacity-5 px-4 py-4 text-xs shadow-md"
      onSubmit={handleSubmit}
    >
      <TextField
        className="w-32"
        select
        onChange={(e) => setFormData({ ...formData, format: e.target.value as ChatsReportFormat })}
        label="Formato"
        required
        defaultValue={formData.format}
      >
        <MenuItem value="txt">TXT</MenuItem>
        <MenuItem value="pdf">PDF</MenuItem>
        <MenuItem value="csv">CSV</MenuItem>
      </TextField>

      <Autocomplete
        className="w-96"
        defaultValue={{ label: "Todos", value: "*" }}
        options={[
          ...users.map((u) => ({ label: u.NOME, value: String(u.CODIGO) })),
          { label: "Todos", value: "*" },
        ]}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Usuário"
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          />
        )}
      />
      <TextField
        className="w-52"
        type="date"
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
      />
      <TextField
        className="w-52"
        type="date"
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
      />
      <div className="ml-auto">
        <Button title="Exportar" type="submit">
          Exportar
        </Button>
      </div>
    </form>
  );
}
