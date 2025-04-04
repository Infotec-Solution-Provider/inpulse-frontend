import AutoComplete from "@/lib/components/auto-complete";
import Button from "@/lib/components/button";
import Select from "@/lib/components/select";
import { FaSearch } from "react-icons/fa";

const searchFieldOptions: Record<string, string> = {
    "Login": "LOGIN",
    "Nome": "NOME",
    "Nível": "NIVEL",
    "Setor": "SETOR",
    "Código inPulse": "CODIGO",
    "Código ERP": "CODIGO-ERP"
};

export default function UserFilteringSection() {
    return (
        <div className="flex gap-5">
            <AutoComplete
                options={searchFieldOptions}
                name="search"
                placeholder="Pesquisar"
                rightIcon={<FaSearch className="text-sm" />}
                maxOptions={5}
            />
            <Select
                options={searchFieldOptions}
                onChange={() => ""}
                name={""}
                placeholder="Filtro"
            />
            <Button>
                Pesquisar
            </Button>
        </div>
    )
}