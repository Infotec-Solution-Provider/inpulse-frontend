"use client";
import InternalGroupsTable from "./(table)/table";

export default function InternalGroupsPage() {
  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      <InternalGroupsTable />
    </div>
  );
}
