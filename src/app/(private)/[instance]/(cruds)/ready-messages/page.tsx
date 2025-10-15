"use client";
import ReadyMessagesTable from "./(table)/table";

export default function ReadyMessagesPage() {
  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      <ReadyMessagesTable />
    </div>
  );
}
