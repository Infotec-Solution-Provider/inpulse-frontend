// @ts-nocheck — exercise real providers, with only their transports replaced.
import { useState } from "react";
import RealReadyProvider, {
  useReadyMessagesContext as useRealReady,
} from "../../src/app/(private)/[instance]/(cruds)/ready-messages/ready-messages-context.tsx?contracts";
import RealGroupsProvider, {
  useInternalGroupsContext as useRealGroups,
} from "../../src/app/(private)/[instance]/(cruds)/internal-groups/internal-groups-context.tsx?contracts";
import RealContactsProvider, {
  useContactsContext as useRealContacts,
} from "../../src/app/(private)/[instance]/(cruds)/contacts/contacts-context.tsx?contracts";
function Probe({ name, run }) {
  const [outcome, setOutcome] = useState("idle");
  return (
    <div>
      <button
        onClick={async () => {
          try {
            await run();
            setOutcome("resolved");
          } catch {
            setOutcome("rejected");
          }
        }}
      >
        {name}
      </button>
      <output data-testid={name}>{outcome}</output>
    </div>
  );
}
function Contracts() {
  const ready = useRealReady(),
    groups = useRealGroups(),
    contacts = useRealContacts();
  return (
    <section>
      <Probe
        name="ready-create"
        run={() =>
          ready.createReadyMessage({ title: "Teste", message: "Teste", sectorId: 1 }, null)
        }
      />
      <Probe name="ready-delete" run={() => ready.deleteReadyMessage(1)} />
      <Probe
        name="group-create"
        run={() => groups.createInternalGroup({ name: "Teste", participants: [1], groupId: null })}
      />
      <Probe
        name="group-update"
        run={() =>
          groups.updateInternalGroup(1, { name: "Teste", participants: [1], wppGroupId: null })
        }
      />
      <Probe
        name="group-image"
        run={() =>
          groups.updateInternalGroupImage(
            1,
            new File(["fixture"], "fixture.png", { type: "image/png" }),
          )
        }
      />
      <Probe name="group-delete" run={() => groups.deleteInternalGroup(1)} />
      <Probe name="contact-delete" run={() => contacts.deleteContact(1)} />
    </section>
  );
}
export default function ProviderContracts() {
  return (
    <RealReadyProvider>
      <RealGroupsProvider>
        <RealContactsProvider>
          <Contracts />
        </RealContactsProvider>
      </RealGroupsProvider>
    </RealReadyProvider>
  );
}
