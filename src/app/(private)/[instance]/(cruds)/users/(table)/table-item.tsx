"use client";
import type { User } from "@/lib/sdk-local";
import { TableRow, TableCell } from "@mui/material";
import { OperationalIconButton, UiIcon } from "@/lib/ui-system";
import { useUsersContext } from "../users-context";
interface Props {
  user: User;
  canEdit: boolean;
  canUseSipConfig: boolean;
  openEditModalHandler: (user: User) => void;
  openSipConfigModalHandler: (user: User) => void;
}
export default function UsersTableItem({
  user,
  canEdit,
  canUseSipConfig,
  openEditModalHandler,
  openSipConfigModalHandler,
}: Props) {
  const { sectors } = useUsersContext();
  const roles: Record<string, string> = {
      ADMIN: "Administrador",
      ATIVO: "Ativo",
      RECEP: "Receptivo",
      AMBOS: "Ambos",
      EXTERNO: "Externo",
    },
    name = user.NOME || `Usuário #${user.CODIGO}`;
  return (
    <TableRow hover>
      <TableCell className="ip-crud-customer-identity" data-label="Usuário">
        <div>
          <strong style={{ fontWeight: 500 }}>{name}</strong>
          <div className="ip-muted" style={{ fontSize: 12, marginTop: 3 }}>
            #{user.CODIGO} · {user.LOGIN || "Sem login"}
          </div>
        </div>
      </TableCell>
      <TableCell data-label="E-mail">{user.EMAIL || "—"}</TableCell>
      <TableCell data-label="Perfil">{roles[user.NIVEL ?? ""] ?? user.NIVEL ?? "—"}</TableCell>
      <TableCell data-label="Setor">
        {sectors.find((s) => s.id === user.SETOR)?.name ??
          (user.SETOR ? `Setor #${user.SETOR}` : "—")}
      </TableCell>
      <TableCell data-label="Ações" align="right">
        <div className="flex justify-end gap-1">
          {canUseSipConfig && (
            <OperationalIconButton
              label={`Configurar SIP de ${name}`}
              tooltip="Configurar SIP"
              onClick={() => openSipConfigModalHandler(user)}
            >
              <UiIcon name="phone" scale="row" />
            </OperationalIconButton>
          )}
          {canEdit && (
            <OperationalIconButton
              label={`Editar ${name}`}
              tooltip="Editar usuário"
              onClick={() => openEditModalHandler(user)}
            >
              <UiIcon name="edit" scale="row" />
            </OperationalIconButton>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
