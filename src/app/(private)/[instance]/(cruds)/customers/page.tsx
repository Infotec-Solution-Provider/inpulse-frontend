"use client"
import CustomersTable from "./(table)/table";

export default function CustomersManagementPage() {
  return (
    <div className="w-full h-[calc(100vh-128px)] p-1 md:p-5 box-border">
      <div className="w-full h-full bg-white dark:dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="w-full h-full overflow-auto">
          <CustomersTable />
        </div>
      </div>
    </div>
  );
}
