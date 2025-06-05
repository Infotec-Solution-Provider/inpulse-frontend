import { Dialog, DialogTitle, IconButton, styled, Tabs } from "@mui/material";

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  }
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: "flex",
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.default,
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  fontSize: 18,
  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.light,
}));

export const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-flexContainer': {
    justifyContent: 'center',
    gap: 2
  },
  '& .MuiTab-root': {
    flex: '1 0 0',
    color: theme.palette.text.primary,
  }
}));
