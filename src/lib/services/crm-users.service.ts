import CrmUserCatalogsClient from "@/lib/sdk-local/crm-user-catalogs.client";
const crmUsersService = new CrmUserCatalogsClient(process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001");
export default crmUsersService;
