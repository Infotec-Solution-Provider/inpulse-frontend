"use client";

import { InternalMessage, WppMessage } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ForwardMessagesModalProps {
  open: boolean;
  onClose: () => void;
  targets: ForwardingTarget[];
  onConfirm: (selectedTargetIds: Set<string>) => void;
}
export interface ForwardingTarget {
  id: string;
  type: "wpp" | "user" | "group" | "internalChat";
  name: string;
  secondaryText?: string;
}
export type ForwardableMessage = WppMessage | InternalMessage;
export default function ForwardMessagesModal({
  open,
  onClose,
  targets,
  onConfirm,
}: ForwardMessagesModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const FORWARD_LIMIT = 5;

  useEffect(() => {
    if (!open) {
      setSelectedTargets(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const filteredTargets = useMemo(() => {
    if (!searchQuery) return targets;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return targets.filter(
      (target) =>
        target.name.toLowerCase().includes(lowerCaseQuery) ||
        target.secondaryText?.toLowerCase().includes(lowerCaseQuery),
    );
  }, [targets, searchQuery]);

  const handleToggleTargetSelection = useCallback((targetId: string) => {
    setSelectedTargets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else if (newSet.size < FORWARD_LIMIT) {
        newSet.add(targetId);
      }
      return newSet;
    });
  }, []);

  const getIconForType = (type: ForwardingTarget["type"]) => {
    switch (type) {
      case "wpp":
        return <WhatsAppIcon color="success" />;
      case "user":
        return <PersonIcon color="primary" />;
      case "group":
        return <GroupIcon color="secondary" />;
      default:
        return <Avatar />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Encaminhar para... ({selectedTargets.size}/{FORWARD_LIMIT})
        <IconButton
          aria-label="fechar"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box px={3} pt={1} pb={1}>
        <TextField
          fullWidth
          autoFocus
          variant="outlined"
          size="small"
          placeholder="Pesquisar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>
      <DialogContent dividers sx={{ p: 0 }}>
        <List sx={{ pt: 0 }}>
          {filteredTargets?.map((target) => {
            const isSelected = selectedTargets.has(target.id);
            const isDisabled = !isSelected && selectedTargets.size >= FORWARD_LIMIT;
            return (
              <ListItem key={target.id} disablePadding>
                <ListItemButton
                  onClick={() => handleToggleTargetSelection(target.id)}
                  disabled={isDisabled}
                >
                  <ListItemAvatar>{getIconForType(target.type)}</ListItemAvatar>
                  <ListItemText primary={target.name} secondary={target.secondaryText} />
                  <Checkbox edge="end" checked={isSelected} disabled={isDisabled} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => onConfirm(selectedTargets)}
          variant="contained"
          disabled={selectedTargets.size === 0}
        >
          Encaminhar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
