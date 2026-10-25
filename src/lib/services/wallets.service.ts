import { WalletsClient } from "@/lib/sdk-local";

export const WALLETS_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";
const walletsClient = new WalletsClient(WALLETS_URL);

export default walletsClient;
