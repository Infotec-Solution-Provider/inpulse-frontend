import { CustomersClient } from "@in.pulse-crm/sdk";
import axios from "axios";

const NEXT_PUBLIC_CUSTOMERS_URL = process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002";

export default new CustomersClient(NEXT_PUBLIC_CUSTOMERS_URL);
