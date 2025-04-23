import { CustomersClient } from "@in.pulse-crm/sdk";

const NEXT_PUBLIC_CUSTOMERS_URL = process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002";

const customersService = new CustomersClient(NEXT_PUBLIC_CUSTOMERS_URL);

export default customersService;
