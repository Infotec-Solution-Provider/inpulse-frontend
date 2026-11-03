"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import customersService from "@/lib/services/customers.service";
import type { DddCitiesReview } from "@/lib/sdk-local/types/crm-catalogs.types";

const labels = {
  exact: "Nome idêntico",
  normalized: "Conferir grafia",
  ambiguous: "Correspondência ambígua",
  missing: "Sem correspondência",
};
export function DddCitiesReviewPanel({ token, instance }: { token: string; instance: string }) {
  const [ddd, setDdd] = useState("");
  const [result, setResult] = useState<DddCitiesReview | null>(null);
  const [selected, setSelected] = useState<Record<number, number | null>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  const [reviewed, setReviewed] = useState(false),
    [saving, setSaving] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    generation.current++;
    setResult(null);
    setSelected({});
    setError("");
    setBusy(false);
    setSaving(false);
    setReviewed(false);
    setUncertain(false);
    setNotice("");
    return () => {
      generation.current++;
    };
  }, [token, instance]);
  async function consult() {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    setResult(null);
    setSelected({});
    setReviewed(false);
    setUncertain(false);
    setNotice("");
    try {
      const response = await customersService.reviewDddCities(ddd, { token, instance });
      if (request === generation.current) setResult(response.data);
    } catch {
      if (request === generation.current)
        setError(
          "Não foi possível consultar ou conferir as cidades deste DDD. Verifique o código e tente novamente. Nenhum vínculo foi alterado.",
        );
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  const links = result
    ? Object.entries(selected).flatMap(([index, cityId]) => {
        const city = result.catalogCities.find((city) => city.CODIGO === cityId),
          providerCity = result.cities[Number(index)]?.name;
        return city && providerCity
          ? [{ cityId: city.CODIGO, expectedName: city.NOME, providerCity }]
          : [];
      })
    : [];
  const duplicate = new Set(links.map((link) => link.cityId)).size !== links.length;
  async function save() {
    if (
      !result ||
      !result.associationWrite.available ||
      !reviewed ||
      !links.length ||
      duplicate ||
      uncertain ||
      saving
    )
      return;
    const request = ++generation.current;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await customersService.associateDddCities(
        result.ddd,
        { uf: result.uf, reviewed: true, links },
        { token, instance },
      );
      if (request !== generation.current) return;
      setNotice(
        `Associações incluídas: ${response.data.added}. Já existentes: ${response.data.existing}. Vínculos anteriores preservados.`,
      );
      setResult((previous) =>
        previous
          ? {
              ...previous,
              existingLinks: [
                ...(previous.existingLinks ?? []),
                ...links
                  .filter(
                    (link) => !previous.existingLinks?.some((old) => old.cityId === link.cityId),
                  )
                  .map((link) => ({
                    cityId: link.cityId,
                    uf: previous.uf,
                    providerCity: link.providerCity,
                  })),
              ],
            }
          : previous,
      );
      setSelected({});
      setReviewed(false);
    } catch {
      if (request === generation.current) {
        setUncertain(true);
        setError(
          "Não foi possível confirmar a gravação. Consulte novamente para conferir os vínculos antes de repetir.",
        );
      }
    } finally {
      if (request === generation.current) setSaving(false);
    }
  }
  return (
    <Box
      component="section"
      aria-label="Consulta de cidades por DDD"
      sx={{ p: { xs: 1, sm: 2 }, minWidth: 0 }}
    >
      <Stack spacing={2}>
        <Typography variant="h6">Cidades do mesmo DDD</Typography>
        <Typography variant="body2">
          Consulte a UF e revise as correspondências com o catálogo do CRM. A consulta não altera
          exceções de discagem local. Para gravar cobertura, cadastre primeiro o DDD e confirme cada
          correspondência.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            label="DDD para consultar"
            value={ddd}
            disabled={busy || saving}
            inputProps={{ maxLength: 2, inputMode: "numeric" }}
            onChange={(event) => {
              generation.current++;
              setDdd(event.target.value);
              setResult(null);
              setSelected({});
              setError("");
              setReviewed(false);
              setUncertain(false);
              setNotice("");
            }}
          />
          <Button
            variant="outlined"
            disabled={busy || saving || !/^[1-9]\d$/.test(ddd)}
            onClick={() => void consult()}
          >
            {busy ? "Consultando…" : "Consultar cidades"}
          </Button>
        </Stack>
        {error && <Alert severity="warning">{error}</Alert>}
        {notice && <Alert severity="success">{notice}</Alert>}
        {result && (
          <>
            <Typography>
              DDD {result.ddd} · UF {result.uf} · {result.cities.length} cidades · Fonte:{" "}
              {result.source}
            </Typography>
            <Alert severity="info">
              {result.associationWrite.reason}{" "}
              {result.associationWrite.available
                ? "Escolher uma cidade não grava automaticamente."
                : "As escolhas abaixo são apenas uma revisão nesta tela e não são gravadas."}
            </Alert>
            {result.existingLinks && (
              <Typography variant="body2">
                Cobertura já cadastrada: {result.existingLinks.length} vínculos.{" "}
                {result.existingLinks
                  .map((link) => `${link.providerCity} · ${link.uf} (#${link.cityId})`)
                  .join("; ")}
              </Typography>
            )}
            <Stack spacing={2} sx={{ maxHeight: 480, overflowY: "auto" }}>
              {result.cities.map((city, index) => (
                <Box
                  key={`${index}:${city.name}`}
                  sx={{ borderBottom: 1, borderColor: "divider", pb: 2 }}
                >
                  <Typography sx={{ overflowWrap: "anywhere" }}>
                    {city.name} · {city.uf}
                  </Typography>
                  <Chip
                    size="small"
                    label={labels[city.status]}
                    color={city.status === "ambiguous" ? "warning" : "default"}
                    sx={{ my: 1 }}
                  />
                  {city.candidates.length > 0 && (
                    <Typography variant="caption" display="block">
                      Candidatos:{" "}
                      {city.candidates
                        .map((candidate) => `${candidate.NOME} (#${candidate.CODIGO})`)
                        .join(", ")}
                    </Typography>
                  )}
                  <Autocomplete
                    disabled={saving || uncertain}
                    options={result.catalogCities}
                    value={
                      result.catalogCities.find((option) => option.CODIGO === selected[index]) ??
                      null
                    }
                    getOptionLabel={(option) => `${option.NOME} · ${option.UF} (#${option.CODIGO})`}
                    isOptionEqualToValue={(a, b) => a.CODIGO === b.CODIGO}
                    onChange={(_, city) => {
                      setSelected((previous) => ({ ...previous, [index]: city?.CODIGO ?? null }));
                      setReviewed(false);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={`Revisar vínculo de ${city.name}`}
                        size="small"
                      />
                    )}
                  />
                </Box>
              ))}
            </Stack>
            {duplicate && (
              <Alert severity="warning">
                Selecione uma cidade CRM diferente para cada correspondência.
              </Alert>
            )}
            {result.associationWrite.available && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reviewed}
                    disabled={saving || uncertain}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                }
                label={`Conferi os nomes e a UF das correspondências selecionadas (${links.length})`}
              />
            )}
            <Button
              variant="contained"
              disabled={
                !result.associationWrite.available ||
                !reviewed ||
                links.length === 0 ||
                duplicate ||
                saving ||
                uncertain
              }
              onClick={() => void save()}
            >
              {result.associationWrite.available
                ? saving
                  ? "Gravando…"
                  : "Gravar associações revisadas"
                : "Gravar associações indisponível"}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
