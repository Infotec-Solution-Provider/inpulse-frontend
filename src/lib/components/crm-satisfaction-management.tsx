"use client";
import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import { CrmPage } from "@/lib/ui-system";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { SatisfactionQuestion } from "@/lib/satisfaction";
export default function SatisfactionPage() {
  const { instance, user, token } = useAuthContext();
  if (!token || user?.NIVEL !== "ADMIN")
    return <Alert severity="warning">Acesso restrito a administradores.</Alert>;
  return (
    <SatisfactionManagement key={`${instance}:${user.CODIGO}`} context={{ instance, token }} />
  );
}
export function SatisfactionManagement({
  context,
}: {
  context: { instance: string; token: string };
}) {
  const [rows, setRows] = useState<SatisfactionQuestion[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [editor, setEditor] = useState<{ row?: SatisfactionQuestion; description: string } | null>(
      null,
    ),
    [removing, setRemoving] = useState<SatisfactionQuestion | null>(null);
  const [saving, setSaving] = useState(false),
    [blocked, setBlocked] = useState(false);
  const active = useRef(true),
    busy = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      generation.current++;
    };
  }, []);
  const reload = async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await customersService.listSatisfactionQuestions(context);
      if (active.current && current === generation.current) {
        setRows(result);
        setBlocked(false);
      }
    } catch {
      if (active.current && current === generation.current)
        setError(
          "Não foi possível consultar o catálogo. Confira a disponibilidade do banco e recarregue.",
        );
    } finally {
      if (active.current && current === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
  }, [context.instance, context.token]);
  const submit = async (method: "create" | "update" | "delete", row?: SatisfactionQuestion) => {
    if (busy.current || blocked) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await customersService.writeSatisfactionQuestion(
        method,
        row?.id ?? 0,
        method === "delete"
          ? { expectedDescription: row!.description }
          : {
              ...(row ? { expectedDescription: row.description } : {}),
              description: editor!.description.trim(),
            },
        context,
      );
      if (!active.current) return;
      setEditor(null);
      setRemoving(null);
      await reload();
    } catch {
      if (active.current) {
        setBlocked(true);
        setError(
          "A gravação não foi confirmada ou a pergunta já possui avaliações. Feche a edição e recarregue antes de tentar novamente.",
        );
      }
    } finally {
      busy.current = false;
      if (active.current) setSaving(false);
    }
  };
  return (
    <CrmPage
      title="Pesquisa da ligação"
      breadcrumbs={[{ label: "Cadastros" }, { label: "Pesquisa da ligação" }]}
    >
      <Stack spacing={2}>
        <Alert severity="info">
          Perguntas com avaliações são preservadas e não podem ser alteradas ou excluídas. Para
          novas perguntas, crie outro registro.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button disabled={loading || saving} onClick={() => void reload()}>
            Recarregar
          </Button>
          <Button
            variant="contained"
            disabled={loading || saving || blocked}
            onClick={() => setEditor({ description: "" })}
          >
            Nova pergunta
          </Button>
        </Stack>
        {loading ? (
          <Typography>Carregando perguntas...</Typography>
        ) : rows.length === 0 ? (
          <Typography>Nenhuma pergunta cadastrada.</Typography>
        ) : (
          rows.map((row) => (
            <Box key={row.id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography sx={{ overflowWrap: "anywhere" }}>
                {row.id} — {row.description}
              </Typography>
              <Typography variant="caption">
                {row.used ? "Possui avaliações — histórico preservado" : "Sem avaliações"}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button
                  disabled={row.used || saving || blocked}
                  onClick={() => setEditor({ row, description: row.description })}
                >
                  Editar pergunta {row.id}
                </Button>
                <Button
                  color="error"
                  disabled={row.used || saving || blocked}
                  onClick={() => setRemoving(row)}
                >
                  Excluir pergunta {row.id}
                </Button>
              </Stack>
            </Box>
          ))
        )}
      </Stack>
      <Dialog
        open={!!editor}
        onClose={() => {
          if (!saving) setEditor(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editor?.row ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            minRows={2}
            fullWidth
            label="Descrição da pergunta"
            value={editor?.description ?? ""}
            disabled={saving || blocked}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            onChange={(e) =>
              setEditor((current) => (current ? { ...current, description: e.target.value } : null))
            }
            sx={{ mt: 1 }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setEditor(null)}>
            Cancelar
          </Button>
          <Button
            disabled={saving || blocked || !editor?.description.trim()}
            onClick={() => void submit(editor?.row ? "update" : "create", editor?.row)}
          >
            Salvar pergunta
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!removing}
        onClose={() => {
          if (!saving) setRemoving(null);
        }}
      >
        <DialogTitle>Excluir pergunta?</DialogTitle>
        <DialogContent>
          <Typography>Apenas perguntas sem avaliações podem ser excluídas.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button
            disabled={saving || blocked}
            color="error"
            onClick={() => void submit("delete", removing!)}
          >
            Confirmar exclusão
          </Button>
        </DialogActions>
      </Dialog>
    </CrmPage>
  );
}
