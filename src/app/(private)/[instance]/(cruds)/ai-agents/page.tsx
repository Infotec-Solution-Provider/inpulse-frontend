"use client";
import AiAgentsTable from "./(table)/table";

export default function AiAgentsPage() {
  return (
    <div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <div className="mx-auto grid w-full max-w-[1480px] gap-6">
        <AiAgentsTable />
      </div>
    </div>
  );
}
