import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Stack,
  Typography,
  Box,
  InputAdornment
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import PublicIcon from '@mui/icons-material/Public';
import { toast } from "react-toastify";
import { useContactsContext } from "../../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";

interface ContactModalProps {
  contact?: WppContact;
}

export default function ContactModal({ contact }: ContactModalProps) {
  const { closeModal, modal, createContact, updateContact } = useContactsContext();
  const isEditMode = !!contact;

  const [name, setName] = useState(contact?.name || "");
  const [ddi, setDdi] = useState("+55");
  const [number, setNumber] = useState("");

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    }

    if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }

    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }

    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("O nome é obrigatório!");
      return;
    }

    if (isEditMode) {
      updateContact(contact.id, name);
    } else {
      if (!number.trim() || !ddi.trim()) {
        toast.error("Telefone completo (DDI + Número) é obrigatório!");
        return;
      }

      const fullPhone = `${ddi}${number.replace(/\D/g, "")}`;
      createContact(name, fullPhone);
    }

    closeModal();
  };

  return (
    <Dialog
      open={!!modal}
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
          maxHeight: "50vh",
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
        {isEditMode ? "Editar Contato" : "Cadastrar Contato"}
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 3, 
        py: 3,
        px: 2
      }}>
        <Box sx={{ width: '100%' }} className="mt-2">
          <TextField
            label="Nome completo"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="outlined"
            size={fullScreen ? 'medium' : 'small'}
            InputLabelProps={{
              shrink: true,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)',
              }
            }}
            placeholder="Digite o nome completo"
          />
        </Box>

        {!isEditMode && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Telefone para contato
            </Typography>
            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
              <TextField
                label="DDI"
                value={ddi}
                onChange={(e) => setDdi(e.target.value)}
                variant="outlined"
                size={fullScreen ? 'medium' : 'small'}
                sx={{ 
                  width: fullScreen ? '40%' : '100px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PublicIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                placeholder="+55"
              />

              <TextField
                label="Número com DDD"
                placeholder="(11) 98765-4321"
                fullWidth
                value={number}
                variant="outlined"
                size={fullScreen ? 'medium' : 'small'}
                onChange={(e) => setNumber(formatPhone(e.target.value))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span>Formato: (DDD) 9XXXX-XXXX</span>
              {!isEditMode && number && number.replace(/\D/g, '').length < 11 && (
                <span style={{ color: theme.palette.warning.main }}>• Número incompleto</span>
              )}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        gap: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        '& > *': {
          margin: '0 !important',
        },
        flexDirection: fullScreen ? 'column' : 'row',
        '& .MuiButton-root': {
          minWidth: fullScreen ? '100%' : '120px',
          height: '44px',
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '0.4px',
          transition: 'all 0.2s ease-in-out',
        },
      }}>
        <Button 
          onClick={closeModal} 
          variant="outlined"
          color="inherit"
          sx={{ 
            borderColor: 'divider',
            color: theme.palette.text.secondary,
            '&:hover': {
              borderColor: 'divider',
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          sx={{ 
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              opacity: 0.7,
            },
          }}
        >
          {isEditMode ? (
            <span>Salvar alterações</span>
          ) : (
            <span>Cadastrar contato</span>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
