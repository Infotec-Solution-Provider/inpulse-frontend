import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContactsContext } from "../../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";

interface DeleteContactModalProps {
  contact: WppContact;
}

export default function DeleteContactModal({ contact }: DeleteContactModalProps) {
  const { deleteContact, closeModal } = useContactsContext();

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const onClickDelete = () => {
    deleteContact(contact.id);
    closeModal();
  };

  return (
    <Dialog
      open={true}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          closeModal();
        }
      }}
      fullScreen={fullScreen}
      maxWidth={false}
      sx={{
        "& .MuiDialog-paper": {
          width: "360px",
          maxWidth: "90vw",
          borderRadius: 3,
          padding: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
        }}
      >
        Deletar Contato
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 5 }}>
        <Typography variant="body1">
          Tem certeza que deseja excluir o contato{" "}
          <strong style={{ color: theme.palette.error.main }}>"{contact.name}"</strong>?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "flex-end" }}>
        <Button color="error" onClick={closeModal}>
          Cancelar
        </Button>
        <Button variant="contained" color="error" onClick={onClickDelete}>
          Deletar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
