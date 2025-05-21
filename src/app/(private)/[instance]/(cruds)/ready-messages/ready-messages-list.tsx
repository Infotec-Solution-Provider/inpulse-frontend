import { useReadyMessagesContext } from "./ready-messages-context";
import { ReadyMessage, User } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { IconButton } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAppContext } from "../../app-context";
import UpdateReadyMessageModal from "./(modal)/update-ready-message-modal";
import { Delete } from "@mui/icons-material";
import DeleteReadyMessageModal from "./(modal)/delete-ready-message-moda";
import { UsersContext } from "../users/users-context";
import { useContext } from "react";


export default function ReadyMessagesList() {
  const { openModal } = useAppContext();
  const { sectors } = useContext(UsersContext);

  const {
    readyMessages,
    updateReadyMessage,
    deleteReadyMessage,
  } = useReadyMessagesContext();

  const openUpdateGroupModal = (readyMessage: ReadyMessage) => () => {
    openModal(
      <UpdateReadyMessageModal
        onSubmit={({ TITULO, TEXTO_MENSAGEM, SETOR, ARQUIVO }) =>
          updateReadyMessage(readyMessage.CODIGO, {
            ...readyMessage,
            TITULO,
            TEXTO_MENSAGEM,
            SETOR: SETOR ?? 0,
          })
        }
        readyMessage={readyMessage}
  />,
    );
  };

  const openDeleteGroupModal = (readyMessage: ReadyMessage) => () => {
    openModal(
      <DeleteReadyMessageModal
        readyMessageId={readyMessage.CODIGO}
        readyMessageName={readyMessage.TITULO || ""}
        deleteGroup={deleteReadyMessage}
      />,
    );
  };

  return (
    <div className="mx-auto w-max overflow-y-auto bg-indigo-700/5">
      <table className="w-max text-sm">
        <thead className="sticky top-0 z-10 rounded-md bg-indigo-900">
          <tr>
            <th className="w-32 px-2 py-6 pl-16 text-left text-lg">Codigo</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Titulo</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Arquivo</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Mensagem</th>
            <th className="w-64 px-2 py-6 text-left text-lg">Setor</th>
            <th className="w-32 px-2 py-6 text-left text-lg">Ultima modificação</th>
            <th className="w-24 px-2 py-6 pr-16 text-left text-lg"></th>
          </tr>
        </thead>
        <tbody className="py-2">
          {readyMessages && readyMessages.length > 0  && readyMessages?.filter(item => item).map((readyMessage) => (
            <tr className="even:bg-indigo-700/5" key={readyMessage.CODIGO}>
              <td className="w-32 truncate px-2 py-6 pl-16 text-lg">{readyMessage.CODIGO}</td>
              <td className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg" title={readyMessage.TITULO}>{readyMessage.TITULO}</td>
              <td className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg" title={readyMessage.ARQUIVO}>{readyMessage.ARQUIVO}</td>
              <td   className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg" title={readyMessage.TEXTO_MENSAGEM}
              >
              {readyMessage.TEXTO_MENSAGEM}
                </td>
              <td className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg">{sectors.find(s => s.id === readyMessage.SETOR)?.name}</td>
              <td className="w-72 truncate px-2 py-6 text-lg">{Formatter.date(readyMessage.LAST_UPDATE)}</td>
              <td className="w-24 truncate px-2 py-6 pr-16 text-lg">
                <IconButton onClick={openUpdateGroupModal(readyMessage)}>
                  <SettingsIcon />
                </IconButton>
                <IconButton onClick={openDeleteGroupModal(readyMessage)}>
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
