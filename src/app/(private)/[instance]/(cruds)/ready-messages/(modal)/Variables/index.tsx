import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import { Close as CloseIcon } from "@/lib/ui-system/crm-icons";
import { useReadyMessagesContext } from "../../ready-messages-context";

interface VariablesMenuProps {
  onSelect: (variableName: string) => void;
  onClose: () => void;
}

export const VariablesMenu = ({ onSelect, onClose }: VariablesMenuProps) => {
  const { variables } = useReadyMessagesContext();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Selecione a variável</Typography>
        <IconButton aria-label="Fechar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <List dense disablePadding>
        {variables?.map((v) => (
          <ListItemButton
            key={`var_${v.name}`}
            onClick={() => {
              onSelect(v.name);
              onClose();
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemText primary={v.name} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
