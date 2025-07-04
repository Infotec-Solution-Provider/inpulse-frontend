import { useContext } from "react";
import { useInternalGroupsContext } from "./internal-groups-context";
import { InternalChatContext } from "../../internal-context";
import { InternalGroup, User } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Button, IconButton, Table, TableBody, TableContainer, TableHead } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAppContext } from "../../app-context";
import UpdateInternalGroupModal from "./(modal)/update-internal-group-modal";
import { Delete } from "@mui/icons-material";
import DeleteInternalGroupModal from "./(modal)/delete-internal-group-moda";
import CreateInternalGroupModal from "./(modal)/create-internal-group-modal";
import { StyledTableRow } from "../customers/(table)/mui-style";
import { StyledTableCell } from "../users/(table)/styles-table";

function getCreator(users: User[], creatorId: number) {
  const creator = users.find((user) => user.CODIGO === creatorId);
  return creator ? creator.NOME : "Desconhecido";
}

export default function InternalGroupsList() {
  const { users } = useContext(InternalChatContext);
  const { openModal } = useAppContext();
  const {
    internalGroups,
    updateInternalGroup,
    wppGroups,
    deleteInternalGroup,
    updateInternalGroupImage,
    createInternalGroup
  } = useInternalGroupsContext();


  const openCreateGroupModal = () => {
    openModal(
      <CreateInternalGroupModal
        onSubmit={async (data) => {
          // Convert participants from string[] to number[]
          await createInternalGroup({
            ...data,
            participants: data.participants.map((p) => Number(p)),
          });
        }}
        wppGroups={wppGroups}
      />
    );
  };

  const openUpdateGroupModal = (group: InternalGroup) => () => {
    openModal(
      <UpdateInternalGroupModal
        onSubmit={updateInternalGroup}
        onSubmitImage={updateInternalGroupImage}
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
    <div className="relative flex h-[calc(80vh)] flex-col">
      <TableContainer className="mx-auto w-max scrollbar-whatsapp dark:bg-indigo-900/10 text-black dark:text-white">
        <Table className="max-h-[100%] overflow-auto scrollbar-whatsapp">
          <TableHead >
            <StyledTableRow className="sticky top-0 z-10 rounded-md text-gray-600 bg-white dark:bg-indigo-900">
              <StyledTableCell >id</StyledTableCell>
              <StyledTableCell className="w-64 px-2 py-6 text-left text-lg">Nome do grupo</StyledTableCell>
              <StyledTableCell className="w-64 px-2 py-6 text-left text-lg">Iniciado em</StyledTableCell>
              <StyledTableCell className="w-64 px-2 py-6 text-left text-lg">Criado por</StyledTableCell>
              <StyledTableCell className="w-32 px-2 py-6 text-left text-lg">Participantes</StyledTableCell>
              <StyledTableCell className="w-24 px-2 py-6 pr-16 text-left text-lg"></StyledTableCell>
            </StyledTableRow>
          </TableHead>
          <TableBody className="py-2">
            {internalGroups.map((group) => (
              <StyledTableRow className="even:bg-indigo-700/5" key={group.id}>
                <StyledTableCell className="w-32 truncate px-2 py-6 pl-16 text-lg">{group.id}</StyledTableCell>
                <StyledTableCell className="w-72 truncate px-2 py-6 text-lg">{group.groupName}</StyledTableCell>
                <StyledTableCell className="w-72 truncate px-2 py-6 text-lg">{Formatter.date(group.startedAt)}</StyledTableCell>
                <StyledTableCell className="w-72 truncate px-2 py-6 text-lg">
                  {getCreator(users, group.creatorId || -3)}
                </StyledTableCell>
                <StyledTableCell className="w-32 truncate px-2 py-6 text-lg">{group.participants.length}</StyledTableCell>
                <StyledTableCell className="w-24 truncate px-2 py-6 pr-16 text-lg">
                  <IconButton onClick={openUpdateGroupModal(group)}>
                    <SettingsIcon />
                  </IconButton>
                  <IconButton onClick={openDeleteGroupModal(group)}>
                    <Delete />
                  </IconButton>
                </StyledTableCell>
            </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="sticky bottom-0 flex self-end pb-2 pt-4">
          <Button variant="outlined" size="large" onClick={openCreateGroupModal}>
            Cadastrar
          </Button>
        </div>
    </div>
  );
}
