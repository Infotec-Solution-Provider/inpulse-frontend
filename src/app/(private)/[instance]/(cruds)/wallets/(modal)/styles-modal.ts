import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { DialogTitle, IconButton, styled, Tabs } from "@mui/material";

export const StyledDialog = styled(Dialog)(() => ({
  "& .MuiPaper-root": {
    borderRadius: "12px",
    overflow: "hidden",
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(() => ({
  alignSelf: "center",
  padding: 0,
  paddingTop: "8px",
  display: "flex",
  color: "text.primary",
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  fontSize: 18,
  color: theme.palette.primary.light,
}));

export const StyledTabs = styled(Tabs)(() => ({
  "& .MuiTabs-flexContainer": {
    justifyContent: "center",
    gap: 2,
  },
  "& .MuiTab-root": {
    flex: "1 0 0",
  },
}));
