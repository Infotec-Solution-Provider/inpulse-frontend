"use client";
import { useParams } from "next/navigation";
import CrmCampaignDetailPage from "@/lib/components/crm-marketing/campaign-detail";
export default function Page() { const params = useParams<{ campaignId: string }>(); return <CrmCampaignDetailPage campaignId={Number(params.campaignId)} initialSection="audience" />; }
