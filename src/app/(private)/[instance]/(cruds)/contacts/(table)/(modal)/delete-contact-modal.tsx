import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  useMediaQuery, 
  useTheme, 
  Box, 
  IconButton,
  CircularProgress
} from "@mui/material";
import { useContactsContext } from "../../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';

interface DeleteContactModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contact?: WppContact | null;
}

export default function DeleteContactModal({ 
  open, 
  onClose, 
  onConfirm, 
  contact 
}: DeleteContactModalProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { contactToDelete, closeDeleteModal, handleDelete, isDeleting } = useContactsContext();

  if (!contactToDelete) return null;

  return (
    <Dialog
      open={!!contactToDelete}
      onClose={closeDeleteModal}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: '448px',
          width: '100%',
          m: 1,
          overflow: 'hidden',
          ...(fullScreen && {
            m: 0,
            maxWidth: '100%',
            borderRadius: 0,
            height: '100%',
            maxHeight: '100%',
          }),
        },
      }}
    >
      <DialogTitle sx={{ 
        p: 3, 
        pb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'error.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'error.contrastText',
          }}>
            <WarningAmberIcon fontSize="medium" />
          </Box>
          <Typography variant="h6" fontWeight={600}>
            Excluir contato
          </Typography>
        </Box>
        <IconButton 
          onClick={closeDeleteModal} 
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 3,
        pt: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}>
        <WarningAmberIcon 
          color="warning" 
          sx={{ 
            fontSize: 64, 
            mb: 2,
            opacity: 0.9,
            color: theme.palette.warning.main,
          }} 
        />
        
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Tem certeza que deseja excluir?
        </Typography>
        
        <Typography variant="body1" color="text.secondary" mb={3}>
          O contato <strong>{contactToDelete?.name}</strong> será removido permanentemente.
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mt={1}>
          Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        pt: 0,
        gap: 2,
        flexDirection: fullScreen ? 'column' : 'row',
        '& > *': {
          m: '0 !important',
          flex: 1,
          minWidth: '120px',
        },
      }}>
        <Button 
          onClick={closeDeleteModal} 
          variant="outlined"
          color="inherit"
          size={fullScreen ? 'large' : 'medium'}
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
          variant="contained" 
          color="error"
          onClick={handleDelete}
          size={fullScreen ? 'large' : 'medium'}
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            fontWeight: 500,
            textTransform: 'none',
            letterSpacing: '0.4px',
            boxShadow: '0 2px 8px rgba(244, 67, 54, 0.2)',
            '&:hover': {
              backgroundColor: theme.palette.error.dark,
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)',
            },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.error.main,
              color: 'white',
              opacity: 0.7,
            },
          }}
        >
          {isDeleting ? 'Excluindo...' : 'Sim, excluir contato'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
