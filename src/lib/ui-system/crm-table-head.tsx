import { TableCell, TableHead, TableRow } from "@mui/material";

export function CrmTableHead({ labels }: { labels: string[] }) {
  return (
    <TableHead>
      <TableRow>
        {labels.map((label, index) => (
          <TableCell key={index} align={label === "Ações" ? "right" : "left"}>
            {label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
