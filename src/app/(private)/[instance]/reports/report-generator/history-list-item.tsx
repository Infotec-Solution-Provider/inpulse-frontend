import { useState, useContext } from "react";
import { SqlReportsContext } from "./sql-reports-context";
import { SqlReport } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

interface Props {
  report: SqlReport;
}

export default function SqlReportHistoryListItem({ report }: Props) {
  const { fillForm, deleteReport } = useContext(SqlReportsContext);
  const [openConfirm, setOpenConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteReport(report.id);
      setOpenConfirm(false);
    } catch (err) {
      // pode adicionar feedback de erro aqui
    }
  };

  return (
    <>
      <li
        onClick={() => fillForm(report.sql, report.description)}
        className="border p-3 rounded-md bg-gray-50 shadow-sm flex justify-between items-center cursor-pointer hover:bg-indigo-50 transition-colors"
      >
        <div>
          <strong className="text-gray-800">{report.description}</strong>
          <br />
          <small className="text-gray-500">{Formatter.date(report.createdAt)}</small>
        </div>

        <Tooltip title="Delete">
          <IconButton
            onClick={e => {
              e.stopPropagation(); // previne o onClick do li
              setOpenConfirm(true);
            }}
            size="small"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </li>

      <Dialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
      >
        <DialogTitle>Confirma exclusão deste relatório?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDelete} autoFocus>Excluir</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
