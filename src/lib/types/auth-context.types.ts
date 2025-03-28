import { User } from "@in.pulse-crm/sdk";

export interface AuthSignForm {
    login: string;
    password: string;
}

export interface AuthContextProps {
    isAuthenticated: boolean;
    user: User | null;
    signIn: (instance: string, data: AuthSignForm) => Promise<void>;
    signOut: () => void;
    token: string | null;
}