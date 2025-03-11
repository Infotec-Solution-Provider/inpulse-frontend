"use client"
import Button from "@/lib/components/button";
import Input from "@/lib/components/input";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import Image from "next/image";
import { FormEventHandler, useContext, useRef } from "react";
import { authContext } from "@/lib/contexts/auth-context";

interface LoginProps {
    params: Promise<{
        instance: string;
    }>;
}

export default function Login({ params }: LoginProps) {
    const { signIn } = useContext(authContext);

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
    }

    return (
        <div className="w-screen h-screen flex items-center">
            <form className="h-full w-full flex flex-col items-center justify-center gap-8" onSubmit={handleSubmit} ref={formRef}>
                <Image src={HorizontalLogo} alt={"Logo"} height={88} className="mb-12" />
                <Input title="Login" name="login" placeholder="Digite seu login" width="26rem" required autoComplete="username" />
                <Input title="Senha" name="password" placeholder="Digite sua senha" width="26rem" type="password" required autoComplete="current-password" />
                <Button width="26rem">
                    <div className="py-1">Entrar</div>
                </Button>
            </form>
        </div>
    )
}