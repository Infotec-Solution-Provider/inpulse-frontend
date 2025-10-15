"use client";
import ContactsTable from "./(table)/table";

export default function ContactsManagementPage() {
  return (
    <div className="box-border flex h-screen w-screen flex-col px-10 pt-5">
      <ContactsTable />
    </div>
  );
}
