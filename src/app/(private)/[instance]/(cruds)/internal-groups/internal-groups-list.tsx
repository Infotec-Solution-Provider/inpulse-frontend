import { useContext } from "react";
import { useInternalGroupsContext } from "./internal-groups-context";
import { InternalChatContext } from "../../internal-context";
import { InternalGroup, User } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { IconButton } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAppContext } from "../../app-context";
import UpdateInternalGroupModal from "./(modal)/update-internal-group-modal";
import { Delete } from "@mui/icons-material";
import DeleteInternalGroupModal from "./(modal)/delete-internal-group-moda";

function getCreator(users: User[], creatorId: number) {
  const creator = users.find((user) => user.CODIGO === creatorId);
  return creator ? creator.NOME : "Desconhecido";
}

export default function InternalGroupsList() {
  const { users } = useContext(InternalChatContext);
  const { openModal } = useAppContext();
  const { internalGroups, updateInternalGroup, wppGroups, deleteInternalGroup } =
    useInternalGroupsContext();

  const openUpdateGroupModal = (group: InternalGroup) => () => {
    openModal(
      <UpdateInternalGroupModal
        onSubmit={updateInternalGroup}
        group={group}
        wppGroups={wppGroups}
      />,
    );
  };

  const openDeleteGroupModal = (group: InternalGroup) => () => {
    openModal(
      <DeleteInternalGroupModal
        groupId={group.id}
        groupName={group.groupName || ""}
        deleteGroup={deleteInternalGroup}
      />,
    );
  };

  return (
    <div className="mx-auto w-max overflow-y-auto bg-indigo-700/5">
      <table className="w-max text-sm">
        <thead className="sticky top-0 z-10 rounded-md bg-indigo-900">
          <tr>
            <th className="w-32 px-2 py-6 pl-16 text-left text-lg">id</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Nome do grupo</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Iniciado em</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Criado por</th>
            <th className="w-32 px-2 py-6 text-left text-lg">Participantes</th>
            <th className="w-24 px-2 py-6 pr-16 text-left text-lg"></th>
          </tr>
        </thead>
        <tbody className="py-2">
          {internalGroups.map((group) => (
            <tr className="even:bg-indigo-700/5" key={group.id}>
              <td className="w-32 truncate px-2 py-6 pl-16 text-lg">{group.id}</td>
              <td className="w-72 truncate px-2 py-6 text-lg">{group.groupName}</td>
              <td className="w-72 truncate px-2 py-6 text-lg">{Formatter.date(group.startedAt)}</td>
              <td className="w-72 truncate px-2 py-6 text-lg">
                {getCreator(users, group.creatorId || -3)}
              </td>
              <td className="w-32 truncate px-2 py-6 text-lg">{group.participants.length}</td>
              <td className="w-24 truncate px-2 py-6 pr-16 text-lg">
                <IconButton onClick={openUpdateGroupModal(group)}>
                  <SettingsIcon />
                </IconButton>
                <IconButton onClick={openDeleteGroupModal(group)}>
                  <Delete />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
