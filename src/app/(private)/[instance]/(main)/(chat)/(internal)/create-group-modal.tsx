// create-group-modal.tsx
"use client";
import { TextField, Button, Avatar, Checkbox, FormControlLabel } from "@mui/material";
import { useContext, useState } from "react";
import { User } from "@in.pulse-crm/sdk";
import { GroupRule } from "./types/chats.types";
import { ChatsReportContext } from "../../../reports/chats/chats-reports-context";

export default function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [rules, setRules] = useState<GroupRule[]>([]);
  const { users } = useContext(ChatsReportContext);

  const handleCreateGroup = () => {
    // Lógica para criar o grupo
    onClose();
  };

  return (
    <div className="w-96 rounded-md bg-slate-800 p-4">
      <h2 className="mb-4 text-xl">Criar Novo Grupo</h2>
      <TextField
        label="Nome do Grupo"
        fullWidth
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="mb-4"
      />

      <div className="mb-4">
        <h3 className="mb-2">Membros</h3>
        <div className="grid grid-cols-2 gap-2">
          {users.map((user) => (
            <FormControlLabel
              key={user.CODIGO}
              control={<Checkbox />}
              label={
                <div className="flex items-center gap-2">
                  <Avatar sx={{ width: 24, height: 24 }} alt={user.NOME} />
                  <span>{user.NOME}</span>
                </div>
              }
            />
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2">Regras do Grupo</h3>
        <Button
          variant="outlined"
          onClick={() => setRules([...rules, { type: "permission", value: "" }])}
        >
          Adicionar Regra
        </Button>
        {rules.map((rule, index) => (
          <div key={index} className="mt-2 flex gap-2">
            <select
              value={rule.type}
              onChange={(e) => {
                const newRules = [...rules];
                newRules[index].type = e.target.value as GroupRule["type"];
                setRules(newRules);
              }}
            >
              <option value="permission">Permissão</option>
              <option value="content">Conteúdo</option>
              <option value="notification">Notificação</option>
            </select>
            <TextField
              value={rule.value}
              onChange={(e) => {
                const newRules = [...rules];
                newRules[index].value = e.target.value;
                setRules(newRules);
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleCreateGroup}>
          Criar Grupo
        </Button>
      </div>
    </div>
  );
}
