"use client"
import CustomersTable from "./(table)/table";

export default function CustomersManagementPage() {
  return (
    <div className="flex flex-col px-10 pt-5 w-screen h-screen box-border relative bg-white text-black dark:bg-gray-900 dark:text-white">
        <CustomersTable />
      </div>
  );
}
