"use client"
import { AuthClient } from "@in.pulse-crm/sdk";

const AUTH_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";
export default new AuthClient(AUTH_URL);