"use client";
import { useAuthContext } from "@/app/auth-context";
import { GenericCatalogManagement, type CatalogManagementApi } from "./crm-catalog-management";
import { CRM_USER_CATALOGS } from "@/lib/crm-user-catalogs-form";
import type { CatalogRecord } from "@/lib/crm-catalogs-form";
import type {
  CrmUserCatalogName,
  CreateCrmUserCatalogRequest,
  CrmUserCatalogExpected,
} from "@/lib/sdk-local/types/crm-users.types";
import crmUsersService from "@/lib/services/crm-users.service";
import { Alert, Button } from "@mui/material";
import { GroupOutlined } from "@mui/icons-material";
import { useMemo, useState } from "react";
import CrmUserGroupMembers from "./crm-user-group-members";

function Management({
  catalog,
  token,
  instance,
}: {
  catalog: CrmUserCatalogName;
  token: string;
  instance: string;
}) {
  const [membersGroup, setMembersGroup] = useState<CatalogRecord | null>(null);
  const api = useMemo<CatalogManagementApi>(
    () => ({
      setAuth: (value) => crmUsersService.setAuth(value),
      conflictOn409: true,
      list: (params, context) =>
        crmUsersService
          .list(
            catalog,
            {
              page: params.page,
              perPage: params.perPage,
              ...(catalog === "sales-types"
                ? {
                    ...(params.search ? { NOME: params.search } : {}),
                    ...(params.id ? { ID: params.id } : {}),
                  }
                : {
                    sortBy: params.sortBy,
                    sortDirection: params.sortDirection,
                    ...(params.search ? { DESCRICAO: params.search } : {}),
                    ...(params.id !== undefined ? { CODIGO: Number(params.id) } : {}),
                  }),
            },
            context,
          )
          .then((response) => ({ ...response, data: response.data.map((row) => ({ ...row })) })),
      get: (id, context) =>
        crmUsersService
          .get(catalog, id, context)
          .then((response) => ({ data: { ...response.data } })),
      create: (data, context) =>
        crmUsersService.create(
          catalog,
          data as CreateCrmUserCatalogRequest<CrmUserCatalogName>,
          context,
        ),
      update: (id, changes, expected, context) =>
        crmUsersService.update(
          catalog,
          id,
          changes,
          expected as CrmUserCatalogExpected<CrmUserCatalogName>,
          context,
        ),
      remove: (id, expected, context) =>
        crmUsersService.remove(
          catalog,
          id,
          expected as CrmUserCatalogExpected<CrmUserCatalogName>,
          context,
        ),
    }),
    [catalog],
  );
  return (
    <>
      <GenericCatalogManagement
        catalog={catalog}
        token={token}
        instance={instance}
        definition={CRM_USER_CATALOGS[catalog]}
        api={api}
        sectionHref="/user-catalogs"
        sectionTitle="Cadastros de usuários"
        parentHref="/users"
        parentTitle="Usuários"
        extraRowActions={
          catalog === "user-groups"
            ? (row) => (
                <Button
                  size="small"
                  startIcon={<GroupOutlined />}
                  onClick={() => setMembersGroup(row)}
                >
                  Membros
                </Button>
              )
            : undefined
        }
      />
      {membersGroup && (
        <CrmUserGroupMembers
          key={`${instance}:${membersGroup.CODIGO}`}
          groupId={Number(membersGroup.CODIGO)}
          groupName={String(membersGroup.DESCRICAO ?? "Sem descrição")}
          token={token}
          instance={instance}
          onClose={() => setMembersGroup(null)}
        />
      )}
    </>
  );
}
export default function CrmUserCatalogManagement({ catalog }: { catalog: CrmUserCatalogName }) {
  const { instance, user, token } = useAuthContext();
  if (user?.NIVEL !== "ADMIN")
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Acesso restrito a administradores.
      </Alert>
    );
  if (!token)
    return (
      <Alert severity="info" sx={{ m: 3 }}>
        Carregando sua sessão…
      </Alert>
    );
  return (
    <Management
      key={`${instance}:${user.CODIGO}:${catalog}`}
      catalog={catalog}
      token={token}
      instance={instance}
    />
  );
}
