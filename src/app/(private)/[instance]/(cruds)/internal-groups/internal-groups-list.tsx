import { useContext } from "react";
import { useInternalGroupsContext } from "./internal-groups-context";
import { InternalChatContext } from "../../internal-context";
import { InternalGroup, User } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Button, IconButton, Table, TableBody, TableContainer, TableHead } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAppContext } from "../../app-context";
import UpdateInternalGroupModal from "./(modal)/update-internal-group-modal";
import { Delete, Add } from "@mui/icons-material";
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
    openModal(<CreateInternalGroupModal onSubmit={createInternalGroup} wppGroups={wppGroups} />);
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
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <TableContainer className="w-full h-full overflow-auto scrollbar-whatsapp dark:bg-indigo-900/10 text-black dark:text-white">
          <Table className="min-w-[800px] lg:min-w-full" size="small">
            <TableHead className="hidden sm:table-header-group">
              <StyledTableRow className="sticky top-0 z-10 rounded-md text-gray-600 bg-white dark:bg-indigo-900">
                <StyledTableCell className="w-32 px-2 py-3 sm:py-4 text-sm sm:text-base">ID</StyledTableCell>
                <StyledTableCell className="min-w-[200px] px-2 py-3 sm:py-4 text-sm sm:text-base">Nome do grupo</StyledTableCell>
                <StyledTableCell className="min-w-[150px] px-2 py-3 sm:py-4 text-sm sm:text-base">Iniciado em</StyledTableCell>
                <StyledTableCell className="min-w-[150px] px-2 py-3 sm:py-4 text-sm sm:text-base">Criado por</StyledTableCell>
                <StyledTableCell className="w-24 px-2 py-3 sm:py-4 text-sm sm:text-base">Participantes</StyledTableCell>
                <StyledTableCell className="w-32 px-2 py-3 sm:py-4 text-sm sm:text-base text-right">Ações</StyledTableCell>
              </StyledTableRow>
            </TableHead>
            <TableBody className="py-2">
              {internalGroups.map((group) => (
                <StyledTableRow key={group.id} className="flex flex-col sm:table-row even:bg-indigo-700/5 hover:bg-gray-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <StyledTableCell className="block sm:table-cell w-full sm:w-auto px-4 py-3 sm:px-2 sm:py-4 text-sm sm:text-base border-b border-gray-100 dark:border-gray-700">
                    <div className="font-medium sm:hidden mb-1">ID</div>
                    <div>{group.id}</div>
                  </StyledTableCell>
                  <StyledTableCell className="block sm:table-cell w-full sm:w-auto px-4 py-3 sm:px-2 sm:py-4 text-sm sm:text-base border-b border-gray-100 dark:border-gray-700">
                    <div className="font-medium sm:hidden mb-1">Nome do grupo</div>
                    <div className="truncate">{group.groupName}</div>
                  </StyledTableCell>
                  <StyledTableCell className="block sm:table-cell w-full sm:w-auto px-4 py-3 sm:px-2 sm:py-4 text-sm sm:text-base border-b border-gray-100 dark:border-gray-700">
                    <div className="font-medium sm:hidden mb-1">Iniciado em</div>
                    <div>{Formatter.date(group.startedAt)}</div>
                  </StyledTableCell>
                  <StyledTableCell className="block sm:table-cell w-full sm:w-auto px-4 py-3 sm:px-2 sm:py-4 text-sm sm:text-base border-b border-gray-100 dark:border-gray-700">
                    <div className="font-medium sm:hidden mb-1">Criado por</div>
                    <div className="truncate">{getCreator(users, group.creatorId || -3)}</div>
                  </StyledTableCell>
                  <StyledTableCell className="block sm:table-cell w-full sm:w-auto px-4 py-3 sm:px-2 sm:py-4 text-sm sm:text-base border-b border-gray-100 dark:border-gray-700">
                    <div className="font-medium sm:hidden mb-1">Participantes</div>
                    <div>{group.participants.length}</div>
                  </StyledTableCell>
                  <StyledTableCell className="block sm:table-cell w-full sm:w-auto px-4 py-3 sm:px-2 sm:py-4 text-sm sm:text-base border-b border-gray-100 dark:border-gray-700">
                    <div className="font-medium sm:hidden mb-2">Ações</div>
                    <div className="flex justify-start sm:justify-end space-x-2">
                      <IconButton 
                        size="small" 
                        onClick={openUpdateGroupModal(group)}
                        className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={openDeleteGroupModal(group)}
                        className="text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </div>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div className="fixed bottom-6 right-6 z-10">
        <IconButton
          aria-label="Criar novo grupo"
          onClick={openCreateGroupModal}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-12 h-12"
          size="large"
        >
          <Add />
        </IconButton>
      </div>
    </div>
  );
}
