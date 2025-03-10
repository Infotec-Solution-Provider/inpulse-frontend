import { UserSDK } from "@in.pulse-crm/sdk";

export default new UserSDK({
    axiosConfig: {
        baseURL: process.env["NEXT_PUBLIC_USERS_URL"]!
    }
});