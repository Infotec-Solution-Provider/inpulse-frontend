import {
  Dialog,
  paginationItemClasses,
  styled,
  TableCell,
  tableCellClasses,
  TablePagination,
  TableRow,
} from "@mui/material";

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: theme.palette.common.white,
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
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

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiPaper-root": {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.common.white,
    padding: theme.spacing(2, 4, 3),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[5],
  },
  "& .MuiDialogTitle-root": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
  },
  "& .MuiDialogContent-root": {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.common.white,
  },
  "& .MuiDialogActions-root": {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.common.white,
  },
  "& .MuiButton-root": {
    color: theme.palette.common.white,
  },
  "& .MuiButton-contained": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
  },
  "& .MuiButton-outlined": {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
  "& .MuiButton-outlined:hover": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
  },
  "& .MuiButton-contained:hover": {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.common.white,
  },
  "& .MuiButton-text": {
    color: theme.palette.common.white,
  },
}));
