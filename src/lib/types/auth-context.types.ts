import { User } from "@/lib/sdk-local";

export interface AuthSignForm {
    login: string;
    password: string;
}

export interface AuthContextProps {
    status: "loading" | "authenticated" | "recovering" | "anonymous";
    isAuthenticated: boolean;
    user: User | null;
    signIn: (instance: string, data: AuthSignForm) => Promise<void>;
    signOut: () => Promise<void>;
    token: string | null;
    instance: string;
    pathname: string;
}
