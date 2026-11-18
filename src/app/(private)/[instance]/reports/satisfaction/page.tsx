import { notFound } from "next/navigation";
import SatisfactionReport from "./satisfaction-report";

export default async function SatisfactionPage({
  params,
}: {
  params: Promise<{ instance: string }>;
}) {
  if ((await params).instance !== "exatron") notFound();
  return <SatisfactionReport />;
}
