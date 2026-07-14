import { WalletsClient } from "@/lib/sdk-local";

const WALLETS_URL = process.env["NEXT_PUBLIC_WALLETS_URL"] || "http://localhost:8005";
const walletsClient = new WalletsClient(WALLETS_URL);

export default walletsClient;
