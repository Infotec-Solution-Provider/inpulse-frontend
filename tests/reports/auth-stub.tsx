import { createContext, useContext } from "react";
import type { AuthContextProps } from "../../src/lib/types/auth-context.types";
export const AuthContext = createContext({} as AuthContextProps);
export const useAuthContext = () => useContext(AuthContext);
