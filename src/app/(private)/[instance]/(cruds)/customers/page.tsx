import CreateClientForm from "./form";
import ClientsList from "./(table)/list";

export default async function ClientsPage() {
  return (
    <div className="mx-auto box-border grid w-[75rem] grid-cols-[75rem] grid-rows-[max-content_1fr] gap-y-8 px-4 py-8">
      <ClientsList />
    </div>
  );
}
