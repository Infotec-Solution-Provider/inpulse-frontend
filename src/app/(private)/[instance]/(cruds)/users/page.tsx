"use client";
import UsersTable from "./(table)/users-table";

export default function UsersManagementPage() {
  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-white text-black dark:bg-gray-900 dark:text-white overflow-hidden">
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
        <div className="max-w-full mx-auto">
          <UsersTable />
        </div>
      </div>
    </div>
  );
}
