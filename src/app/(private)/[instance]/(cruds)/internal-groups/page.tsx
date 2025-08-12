"use client";
import InternalGroupsList from "./internal-groups-list";

export default function InternalGroupsPage() {
  return (
    <div className="flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 pt-3 sm:pt-4 md:pt-5 w-full h-full min-h-screen box-border relative bg-white text-black dark:bg-gray-900 dark:text-white">
      <div className="w-full max-w-[100vw] overflow-x-auto">
        <InternalGroupsList />
      </div>
    </div>
  );
}
