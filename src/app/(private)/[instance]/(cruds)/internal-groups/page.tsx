"use client";
import { Button } from "@mui/material";
import { useInternalGroupsContext } from "./internal-groups-context";
import InternalGroupsList from "./internal-groups-list";
import { useAppContext } from "../../app-context";
import CreateInternalGroupModal from "./(modal)/create-internal-group-modal";

export default function InternalGroupsPage() {
  const { openModal } = useAppContext();

  const { createInternalGroup } = useInternalGroupsContext();

  const openCreateGroupModal = () => {
    openModal(<CreateInternalGroupModal onSubmit={createInternalGroup} />);
  };

  return (
    <div className="mx-auto box-border grid max-w-[75rem] grid-cols-[75rem] grid-rows-[1fr_auto] gap-8 py-8">
      <InternalGroupsList />
      <div className="flex h-max w-full justify-end">
        <Button variant="outlined" size="large" onClick={openCreateGroupModal}>
          Cadastrar
        </Button>
      </div>
    </div>
  );
}
