"use client";
import InternalGroupTable from "./(table)/internalgroups-table";

export default function InternalGroupManagementPage() {
    return (
        <div className="flex flex-col px-10 pt-5 w-screen h-screen box-border relative">
            <InternalGroupTable />
        </div>
    );
}