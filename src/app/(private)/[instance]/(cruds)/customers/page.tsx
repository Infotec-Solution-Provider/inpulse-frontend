"use client";
import CustomersTable from "./(table)/table";

export default function CustomersManagementPage() {
  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      <CustomersTable />
    </div>
  );
}
