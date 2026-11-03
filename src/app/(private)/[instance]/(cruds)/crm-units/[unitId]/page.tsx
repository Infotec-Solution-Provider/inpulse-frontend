"use client";
import { useParams } from "next/navigation";
import CrmUnitsPage from "@/lib/components/crm-marketing/units";
export default function Page() { const { unitId } = useParams<{ unitId: string }>(); return <CrmUnitsPage unitId={Number(unitId)} />; }
