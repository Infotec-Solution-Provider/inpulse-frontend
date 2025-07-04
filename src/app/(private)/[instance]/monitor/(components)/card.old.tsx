"use client";
import { Avatar } from "@mui/material";

type TagType = "whatsapp" | "internal" | "groups" | "scheduled" | "finished";

const MonitorTag = ({ type }: { type: TagType }) => {
  const tagStyles: Record<TagType, string> = {
    whatsapp: "bg-green-600 text-white",
    internal: "bg-blue-600 text-white",
    groups: "bg-purple-600 text-white",
    scheduled: "bg-orange-600 text-white",
    finished: "bg-gray-600 text-white",
  };

  const tagNames: Record<TagType, string> = {
    whatsapp: "Whatsapp",
    internal: "Interno",
    groups: "Grupo",
    scheduled: "Agendado",
    finished: "Finalizado",
  };

  return (
    <span className={`inline-flex items-center rounded-xl px-2 py-1 text-xs ${tagStyles[type]}`}>
      {tagNames[type]}
    </span>
  );
};

export default function MonitorCard() {
  return (
    <div className="mb-2 w-full rounded-md border border-transparent bg-slate-200 py-2 pl-2 pr-4 text-slate-700 hover:cursor-pointer hover:border-orange-600 hover:opacity-75 dark:bg-slate-800 dark:text-slate-200">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Avatar alt={"Teste"} src={""} sx={{ width: 84, height: 84 }} variant="square" />
          <div className="flex flex-col">
            <span className="text-xl font-semibold"> Diego Souza </span>
            <span className="font-semibold">Infotec Solution Provider</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              10/10/2023 14:30 - Em andamento
            </span>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2 pb-2">
            <div className="flex items-center gap-1">
              <MonitorTag type="whatsapp" />
              <MonitorTag type="scheduled" />
              <MonitorTag type="finished" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              10/10/2023 14:30 - Em andamento
            </span>
            <span className="text-lg font-semibold leading-none text-indigo-600 dark:text-indigo-300">
              Renan Dutra
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
