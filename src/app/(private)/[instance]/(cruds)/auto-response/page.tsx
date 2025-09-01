"use client";

import RulesList from "./rules-list";

export default function AutoResponseRulesPage() {
  return (
    <div className="flex flex-col w-full h-full bg-slate-50 text-slate-800 dark:bg-gray-900 dark:text-slate-200">
      <RulesList />
    </div>
  );
}
