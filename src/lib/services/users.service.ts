import { UsersClient } from "@in.pulse-crm/sdk";

const USERS_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";

const usersService = new UsersClient(USERS_URL);

export default usersService;