"use client";
import ContactsTable from "./(table)/table";

export default function ContactsManagementPage() {
  return (
    <div className="box-border flex h-full min-h-0 w-full min-w-0 flex-col px-10 pt-5">
      <ContactsTable />
    </div>
  );
}
