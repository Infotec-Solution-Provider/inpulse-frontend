import { CustomerSDK } from "@in.pulse-crm/sdk";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CUSTOMERS_URL,
  timeout: 60000,
});

export default new CustomerSDK(axiosInstance);
