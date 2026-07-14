"use client";

import HorizontalLogo from "@/assets/img/hlogodark.png";
import darkTheme from "@/lib/themes/dark";
import { Button, TextField, ThemeProvider } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const LAST_TENANT_STORAGE_KEY = "@inpulse/last-tenant";

function normalizeTenantName(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
}

export default function TenantEntryPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState("");

  useEffect(() => {
    const savedTenant = normalizeTenantName(localStorage.getItem(LAST_TENANT_STORAGE_KEY) ?? "");
    if (savedTenant) {
      router.replace(`/${savedTenant}/login`);
    }
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTenant = normalizeTenantName(tenant);
    if (!normalizedTenant) {
      return;
    }

    localStorage.setItem(LAST_TENANT_STORAGE_KEY, normalizedTenant);
    router.push(`/${normalizedTenant}/login`);
  };

  return (
    <div className="flex h-screen w-screen items-center">
      <ThemeProvider theme={darkTheme}>
        <form
          className="mx-auto box-border flex w-80 flex-col gap-4 rounded-md bg-indigo-500/5 px-8 py-8 pt-14"
          onSubmit={handleSubmit}
        >
          <Image src={HorizontalLogo} alt="Logo" height={64} className="mb-12" />
          <TextField
            title="Tenant"
            name="tenant"
            placeholder="Digite o nome da empresa"
            value={tenant}
            onChange={(event) => setTenant(event.target.value)}
            required
            autoComplete="organization"
          />
          <Button fullWidth sx={{ paddingTop: 1.5, paddingBottom: 1.5, marginTop: 0.5 }} variant="contained" type="submit">
            Continuar
          </Button>
        </form>
      </ThemeProvider>
    </div>
  );
}