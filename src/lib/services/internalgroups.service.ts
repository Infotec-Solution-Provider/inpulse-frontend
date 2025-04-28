import { InternalGroupClient } from "@in.pulse-crm/sdk";

const USERS_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";

const groupsService = new InternalGroupClient(USERS_URL);

export default groupsService;