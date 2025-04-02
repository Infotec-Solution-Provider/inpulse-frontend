"use client";
import AutoComplete from "@/lib/components/auto-complete";
import Input from "@/lib/components/input";
import Button from "@/lib/components/button";
import { FormEventHandler, useCallback, useContext, useMemo, useRef, useState } from "react";
import { FaFileDownload } from "react-icons/fa";
import Select from "@/lib/components/select";
import { ChatsReportFileFormat } from "@in.pulse-crm/sdk";
import { Client } from "./type";
import { InputBase } from "@mui/material";

export default function CreateClientForm() {
  const [formData, setFormData] = useState<Partial<Client>>();

  function handleSubmit() {}

  return (
    <form
      className="grid grid-cols-1 gap-10 bg-indigo-700 bg-opacity-5 px-4 py-4 text-xs shadow-md sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={handleSubmit}
    >
      <InputBase title="Nome" name="name" type="text" required />
      <Input
        title="Fantasia"
        name="fantasy"
        type="text"
        required
        onChange={(value) => setFormData({ ...formData, fantasy: value })}
      />
      <Select
        name="active"
        label="Ativo"
        required
        options={{
          Sim: "Sim",
          Não: "Não",
        }}
        onChange={(value) => setFormData({ ...formData, active: value === "true" })}
      />
      <Select
        name="Tipo de Pessoa"
        label="Tipo de Pessoa"
        options={{
          Jurídica: "Jur",
          Física: "Fis",
        }}
        required
        onChange={(value) => setFormData({ ...formData, personType: value ?? undefined })}
      />
      <Input
        title="CPF"
        name="cpf"
        type="text"
        required
        onChange={(value) => setFormData({ ...formData, cpf: value })}
      />
      <Input
        title="Cidade"
        name="city"
        type="text"
        required
        onChange={(value) => setFormData({ ...formData, city: value })}
      />
      <Input
        title="ERP"
        name="erp"
        type="text"
        onChange={(value) => setFormData({ ...formData, erp: value })}
      />
    </form>
  );
}
