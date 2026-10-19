import { redirect } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ instance: string }> }) {
  const { instance } = await params;
  redirect(`/${encodeURIComponent(instance)}/customers`);
}
