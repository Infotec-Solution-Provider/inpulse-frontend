"use client"
import ContactsTable from "./(table)/table";

export default function ContactsManagementPage() {
  return (
    <div className="flex flex-col px-10 pt-5 w-screen h-screen box-border relative bg-white text-black dark:bg-gray-900 dark:text-white">
        <ContactsTable />
      </div>
  );
}
