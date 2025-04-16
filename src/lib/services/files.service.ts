import { FilesClient } from "@in.pulse-crm/sdk";

const FILES_URL = process.env["NEXT_PUBLIC_FILES_URL"] || "http://localhost:8003";

export default new FilesClient(FILES_URL);
