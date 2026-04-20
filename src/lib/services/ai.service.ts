import { AiClient } from "@in.pulse-crm/sdk";

const aiService = new AiClient(process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8008");

export default aiService;
