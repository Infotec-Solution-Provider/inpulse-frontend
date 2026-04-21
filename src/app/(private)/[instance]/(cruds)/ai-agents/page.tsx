"use client";
import AiAgentsTable from "./(table)/table";

export default function AiAgentsPage() {
  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      <AiAgentsTable />
    </div>
  );
}
