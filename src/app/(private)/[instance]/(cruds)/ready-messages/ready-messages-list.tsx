import { ReadyMessage } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Delete } from "@mui/icons-material";
import SettingsIcon from "@mui/icons-material/Settings";
import { Button, IconButton, Table, TableContainer } from "@mui/material";
import { useAppContext } from "../../app-context";
import { useWhatsappContext } from "../../whatsapp-context";
import CreateReadyMessageModal from "./(modal)/create-ready-message-modal";
import DeleteReadyMessageModal from "./(modal)/delete-ready-message-moda";
import UpdateReadyMessageModal from "./(modal)/update-ready-message-modal";
import { useReadyMessagesContext } from "./ready-messages-context";

export default function ReadyMessagesList() {
  const { openModal } = useAppContext();
  const { sectors } = useWhatsappContext();

  const { createReadyMessage } = useReadyMessagesContext();

  const openCreateReadyMessageModal = () => {
    openModal(
      <CreateReadyMessageModal onSubmit={(data, file) => createReadyMessage(data, file)} />,
    );
  };

  const { readyMessages, updateReadyMessage, deleteReadyMessage } = useReadyMessagesContext();

  const openUpdateGroupModal = (readyMessage: ReadyMessage) => () => {
    openModal(
      <UpdateReadyMessageModal
        onSubmit={(data, file) => updateReadyMessage(readyMessage.id, data, file)}
        readyMessage={readyMessage}
      />,
    );
  };

  const openDeleteGroupModal = (readyMessage: ReadyMessage) => () => {
    openModal(
      <DeleteReadyMessageModal
        readyMessageId={readyMessage.id}
        readyMessageName={readyMessage.title || ""}
        deleteGroup={deleteReadyMessage}
      />,
    );
  };

  return (
    <div className="relative flex h-[calc(100vh-100px)] flex-col">
      <TableContainer className="scrollBar scrollbar-whatsapp mx-auto w-full flex-1 bg-white text-gray-800 shadow-md dark:bg-indigo-700 dark:bg-opacity-5 dark:text-white">
        <Table className="w-max text-sm">
          <thead className="sticky top-0 z-10 bg-white text-gray-800 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gray-300 dark:bg-indigo-900 dark:text-white dark:after:bg-indigo-600">
            <tr>
              <th className="w-32 px-2 py-6 pl-16 text-left text-lg">Codigo</th>
              <th className="w-64 px-2 py-6 text-left text-lg">Titulo</th>
              <th className="w-64 px-2 py-6 text-left text-lg">Arquivo</th>
              <th className="w-64 px-2 py-6 text-left text-lg">Mensagem</th>
              <th className="w-64 px-2 py-6 text-left text-lg">Setor</th>
              <th className="w-32 px-2 py-6 text-left text-lg">Ultima modificação</th>
              <th className="w-24 px-2 py-6 pr-16 text-left text-lg">Ações</th>
            </tr>
          </thead>
          <tbody className="py-2">
            {readyMessages &&
              readyMessages.length > 0 &&
              readyMessages
                ?.filter((item) => item)
                .map((readyMessage) => (
                  <tr className="even:bg-indigo-700/5" key={readyMessage.id}>
                    <td className="w-32 truncate px-2 py-6 pl-16 text-lg">{readyMessage.id}</td>
                    <td
                      className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg"
                      title={readyMessage.title}
                    >
                      {readyMessage.title}
                    </td>
                    <td
                      className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg"
                      title={readyMessage.fileId ? "Arquivo anexado" : "Nenhum arquivo"}
                    >
                      {readyMessage.fileId ? "Arquivo anexado" : "Nenhum arquivo"}
                    </td>
                    <td
                      className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg"
                      title={readyMessage.message}
                    >
                      {readyMessage.message}
                    </td>
                    <td className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-2 py-6 text-lg">
                      {sectors?.find((s) => s.id === readyMessage.sectorId)?.name}
                    </td>
                    <td className="w-72 truncate px-2 py-6 text-lg">
                      {Formatter.date(readyMessage.updatedAt)}
                    </td>
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
        </Table>
      </TableContainer>

      <div className="flex h-max justify-end">
        <Button variant="outlined" size="large" onClick={openCreateReadyMessageModal}>
          Cadastrar
        </Button>
      </div>
    </div>
  );
}
