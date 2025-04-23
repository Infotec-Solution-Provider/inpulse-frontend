import { AuthClient } from "@in.pulse-crm/sdk";

const AUTH_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";

const authService = new AuthClient(AUTH_URL);

export default authService;
