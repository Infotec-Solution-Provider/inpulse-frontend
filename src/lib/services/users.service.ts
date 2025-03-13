import { UserSDK } from "@in.pulse-crm/sdk";
import axios from "axios";

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_USERS_URL,
    timeout: 10000,
});

export default new UserSDK(axiosInstance);