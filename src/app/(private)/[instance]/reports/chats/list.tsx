"use client";
import { useContext } from "react";
import ChatReportListItem from "./list-item";

import { ChatsReportContext } from "./chats-reports-context";

export default function ChatsReportList() {
  const { reports, users } = useContext(ChatsReportContext);

  return (
    <div className="mx-auto w-full overflow-y-scroll bg-indigo-700/5">
      <table className="w-max text-sm">
        <thead className="sticky top-0 rounded-md bg-indigo-900">
          <tr>
            <th className="w-44 px-2 py-2 pl-8 text-left">Status</th>
            <th className="w-48 px-2 py-2 text-left">Usuário</th>
            <th className="w-48 px-2 py-2 text-left">Gerado em</th>
            <th className="w-28 px-2 py-2 text-left">De</th>
            <th className="w-28 px-2 py-2 text-left">Até</th>
            <th className="w-24 px-2 py-2 text-left">Chats</th>
            <th className="w-28 px-2 py-2 text-left">Mensagens</th>
            <th className="w-24 px-2 py-2 text-left">Formato</th>
            <th className="w-24 px-2 py-2 pr-4 text-left"></th>
          </tr>
        </thead>
        <tbody className="w-full py-2">
          {reports.map((report) => (
            <ChatReportListItem
              report={report}
              user={users.find((u) => u.CODIGO == +report.userId)?.NOME || "Todos"}
              key={`report:${report.id}`}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
