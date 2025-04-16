import { paginationItemClasses, styled, TableCell, tableCellClasses, TablePagination, TableRow } from "@mui/material";

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: "none",
  [`&.${tableCellClasses.head}`]: {
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: theme.palette.common.white,
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
    color: theme.palette.common.white,
    "&.Mui-selected": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
    },
    "&:hover": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
    },
  },
}));
