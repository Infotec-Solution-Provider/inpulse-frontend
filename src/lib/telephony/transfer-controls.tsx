"use client";
import { useEffect, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import usersService, { type TransferOption } from "../services/users.service";
import { useTelephony } from "./telephony-provider";

export function TransferControls() {
  const phone = useTelephony(), { token, instance } = useAuthContext();
  const [options, setOptions] = useState<TransferOption[]>([]), [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    if (!token) return;
    usersService.setAuth(token);
    void usersService.getTelephonyTransferOptions().then(data => { if (current) setOptions(data.filter(item => item.extension !== phone.state.extension)); }).catch(() => { if (current) setError("Não foi possível listar os ramais. Você pode digitar um ramal interno."); });
    return () => { current = false; };
  }, [token, instance, phone.state.extension]);
  return <details><summary className="cursor-pointer text-sm font-medium">Transferir ligação</summary><div className="mt-3 space-y-3">
    {error && <Alert severity="warning">{error}</Alert>}
    {options.length > 0 && <TextField select size="small" fullWidth label="Operador ou outro ramal" value={options.some(item => item.extension === target) ? target : ""} disabled={phone.state.transferPending} onChange={event => setTarget(event.target.value)}><MenuItem value="">Selecionar</MenuItem>{options.map(item => <MenuItem key={item.key} value={item.extension}>{item.name} · {item.extension}</MenuItem>)}</TextField>}
    <TextField fullWidth size="small" label="Ou digite o ramal interno" value={target} disabled={phone.state.transferPending} slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 16 } }} onChange={event => setTarget(event.target.value)} />
    <Button variant="outlined" disabled={phone.state.transferPending || !/^[0-9]{1,16}$/.test(target)} onClick={() => { setError(null); try { phone.transfer(target); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível transferir."); } }}>{phone.state.transferPending ? "Transferindo…" : "Transferir"}</Button>
  </div></details>;
}
