import { paginationItemClasses, styled, TableCell, tableCellClasses, TablePagination, TableRow } from "@mui/material";

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: "none",
  [`&.${tableCellClasses.head}`]: {
    color: theme.palette.text.primary,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: theme.palette.text.primary,
  },
}));

export const StyledTableRow = styled(TableRow)(() => ({
  "&:nth-of-type(even)": {
    backgroundColor: "rgba(67, 56, 202, 0.05)",
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

export const StyledPagination = styled(TablePagination)(({ theme }) => ({
  [`& .${paginationItemClasses.root}`]: {
    color: theme.palette.text.primary,
    "&.Mui-selected": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.text.primary,
    },
    "&:hover": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.text.primary,
    },
  },
}));
