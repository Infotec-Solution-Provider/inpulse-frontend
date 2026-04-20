"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { toast } from "react-toastify";
import { useContext } from "react";
import { AuthContext } from "@/app/auth-context";
import funnelApiService from "@/lib/services/funnel.service";
import { useFunnelContext } from "@/app/(private)/[instance]/(cruds)/funnel/[funnelId]/funnel-context";
import type { FunnelCard } from "@/lib/types/funnel.types";

interface AddCustomerDialogProps {
  open: boolean;
  stageId: number;
  onClose: () => void;
}

export default function AddCustomerDialog({ open, stageId, onClose }: AddCustomerDialogProps) {
  const { token } = useContext(AuthContext);
  const { addManualEntry, funnelId } = useFunnelContext();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FunnelCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setAdding(null);
    }
  }, [open]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!token || q.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await funnelApiService.searchCustomers(token, funnelId, q.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [token],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleAdd = async (ccId: number) => {
    setAdding(ccId);
    try {
      await addManualEntry(stageId, ccId);
      toast.success("Cliente adicionado ao estágio.");
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Erro ao adicionar cliente.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PersonAddIcon fontSize="small" />
        Adicionar cliente
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Buscar por nome ou telefone…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          sx={{ mb: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
              </InputAdornment>
            ),
          }}
        />

        {query.trim().length > 0 && query.trim().length < 2 && (
          <Typography variant="caption" color="text.secondary">
            Digite ao menos 2 caracteres para buscar.
          </Typography>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            Nenhum cliente encontrado.
          </Typography>
        )}

        {results.length > 0 && (
          <List dense disablePadding>
            {results.map((r) => (
              <ListItemButton
                key={r.ccId}
                disabled={adding === r.ccId}
                onClick={() => handleAdd(r.ccId)}
                sx={{ borderRadius: 1, px: 1 }}
              >
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, mr: 1.5 }}>
                  {r.nome.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={r.nome}
                  secondary={r.fone1 ?? undefined}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
                {adding === r.ccId && <CircularProgress size={16} sx={{ ml: 1 }} />}
              </ListItemButton>
            ))}
          </List>
        )}

        <Button onClick={onClose} size="small" sx={{ mt: 1.5 }} fullWidth>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
