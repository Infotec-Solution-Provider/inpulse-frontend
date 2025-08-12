"use client";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import Image from "next/image";
import { FormEventHandler, useContext, useRef } from "react";
import { AuthContext } from "@/app/auth-context";
import { Button, TextField, ThemeProvider } from "@mui/material";
import darkTheme from "@/lib/themes/dark";

interface LoginProps {
  params: Promise<{
    instance: string;
  }>;
}

export default function Login({ params }: LoginProps) {
  const { signIn } = useContext(AuthContext);

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const { instance } = await params;

    const formData = new FormData(formRef.current!);
    const data = Object.fromEntries(formData.entries());

    await signIn(instance, {
      login: data.login as string,
      password: data.password as string,
    });
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center p-4">
      <ThemeProvider theme={darkTheme}>
        <form
          className="mx-auto box-border flex w-full max-w-md flex-col gap-4 rounded-md bg-indigo-500/5 px-8 py-8 pt-14"
          onSubmit={handleSubmit}
          ref={formRef}
          style={{
            maxHeight: '90vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          <Image src={HorizontalLogo} alt={"Logo"} height={64} className="mb-12" />
          <TextField
            title="Login"
            name="login"
            placeholder="Digite seu login"
            required
            autoComplete="username"
          />
          <TextField
            title="Senha"
            name="password"
            placeholder="Digite sua senha"
            type="password"
            required
            autoComplete="current-password"
          />
          <Button
            fullWidth
            sx={{ 
              paddingTop: 1.5, 
              paddingBottom: 1.5, 
              marginTop: 0.5,
              marginBottom: 'env(safe-area-inset-bottom, 20px)'
            }}
            variant="contained"
            type="submit"
          >
            Entrar
          </Button>
          {/* Add some padding at the bottom when keyboard is open */}
          <div className="h-12 w-full sm:h-0" />
        </form>
      </ThemeProvider>
    </div>
  );
}
