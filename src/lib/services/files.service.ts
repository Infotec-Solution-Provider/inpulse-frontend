import { FilesClient } from "@in.pulse-crm/sdk";

const FILES_URL = process.env["NEXT_PUBLIC_FILES_URL"] || "http://localhost:8003";

const filesService = new FilesClient(FILES_URL);

export default filesService;
