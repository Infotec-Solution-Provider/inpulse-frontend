import {
  paginationItemClasses,
  styled,
  TableCell,
  tableCellClasses,
  TablePagination,
  TableRow
} from "@mui/material";

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: "none",
  [`&.${tableCellClasses.head}`]: {
    color: theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.text.primary,
    backgroundColor: theme.palette.mode === "dark"
      ? "transparent"
      : theme.palette.grey[100],
    fontWeight: 'bold',
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.text.primary,
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.mode === "dark"
      ? "rgba(67, 56, 202, 0.05)"
      : theme.palette.action.hover,
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

export const StyledPagination = styled(TablePagination)(({ theme }) => ({
  [`& .${paginationItemClasses.root}`]: {
    color: theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.text.primary,
    "&.Mui-selected": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
    },
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      color: theme.palette.common.white,
    },
  },
}));
