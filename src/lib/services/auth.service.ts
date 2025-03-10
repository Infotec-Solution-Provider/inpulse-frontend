import { AuthSDK } from "@in.pulse-crm/sdk";

export default new AuthSDK({
    axiosConfig: {
        baseURL: process.env["NEXT_PUBLIC_USERS_URL"]!,
    }
});