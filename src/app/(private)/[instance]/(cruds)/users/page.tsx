"use client";
import UsersTable from "./(table)/table";

export default function UsersManagementPage() {
  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      <UsersTable />
    </div>
  );
}
