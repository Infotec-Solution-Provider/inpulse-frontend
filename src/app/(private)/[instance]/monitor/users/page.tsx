import OperatorsTable from "./(table)/table";

export default async function UsersPage() {
  return (
    <div className="mx-auto box-border grid grid-cols-[80rem] grid-rows-[max-content_1fr] gap-y-8 px-4 py-8">
      <OperatorsTable />
    </div>
  );
}
