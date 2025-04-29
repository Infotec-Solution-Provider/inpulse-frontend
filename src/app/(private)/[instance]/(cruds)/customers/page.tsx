"use client"
import CustomersProvider from "./(table)/customers-context";
import CustomersTable from "./(table)/table";

export default function CustomersPage() {
  return (
    <CustomersProvider>
      <div className="mx-auto box-border grid grid-cols-[85rem] gap-y-8 px-4 py-8">
        <CustomersTable />
      </div>
    </CustomersProvider>
  );
}
