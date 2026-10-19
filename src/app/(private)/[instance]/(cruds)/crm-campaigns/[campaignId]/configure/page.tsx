"use client";
import { useParams } from "next/navigation";
import CrmConfigurationPage from "@/lib/components/crm-marketing/configuration";
export default function Page() { const params = useParams<{ campaignId: string }>(); return <CrmConfigurationPage campaignId={Number(params.campaignId)} />; }
