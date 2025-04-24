import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AssignmentTurnedIn, SyncAlt } from "@mui/icons-material";
const MOCK_DATA = [1, 2, 3,4,5,6,7,8];

export default function MonitorAttendances() {
  return (
    <div>
      <table className="mx-auto mt-8">
        <thead>
          <tr className="bg-indigo-700">
            <th className="w-44 px-4 py-2">Ações</th>
            <th className="w-16 px-4 py-2">Código</th>
            <th className="w-32 px-4 py-2">Código ERP</th>
            <th className="px-4 py-2">Razão</th>
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">WhatsApp</th>
            <th className="px-4 py-2">Setor</th>
            <th className="px-4 py-2">Atendente</th>
            <th className="px-4 py-2">Data Início</th>
            <th className="px-4 py-2">Data Fim</th>
            <th className="px-4 py-2">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_DATA.map((index) => (
            <tr className="even:bg-indigo-200/5">
              <td className="w-44 px-4 py-2">
                <div>
                  <IconButton>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton>
                    <SyncAlt color="secondary" />
                  </IconButton>
                  <IconButton>
                    <AssignmentTurnedIn color="success" />
                  </IconButton>
                </div>
              </td>
              <td className="w-24 px-4 py-2">1</td>
              <td className="w-32 px-4 py-2">123456</td>
              <td className="px-4 py-2">Company X</td>
              <td className="px-4 py-2">John Doe</td>
              <td className="px-4 py-2">+55 11 91234-5678</td>
              <td className="px-4 py-2">Vendas</td>
              <td className="px-4 py-2">Atendente {index}</td>
              <td className="px-4 py-2">15/04/2025 14:32</td>
              <td className="px-4 py-2"></td>
              <td className="px-4 py-2"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
