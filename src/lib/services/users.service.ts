"use client";
import { UsersClient } from "@in.pulse-crm/sdk";

const USERS_URL = process.env["NEXT_PUBLIC_USERS_URL"] || "http://localhost:8001";
export default new UsersClient(USERS_URL);
