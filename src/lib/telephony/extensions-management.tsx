"use client";
import { useEffect, useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import usersService, { type TelephonyExtension } from "../services/users.service";

export function ExtensionsManagement() {
  const { instance, user } = useAuthContext();
  return <Directory key={`${instance}:${user?.CODIGO}`} />;
}

function Directory() {
  const { token, instance, user } = useAuthContext();
  const [rows, setRows] = useState<TelephonyExtension[]>([]), [editing, setEditing] = useState<TelephonyExtension | null>(null);
  const [name, setName] = useState(""), [extension, setExtension] = useState("");
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState<string | null>(null);
  const allowed = user?.NIVEL === "ADMIN";
  async function load() {
    if (!token || !allowed) return;
    setBusy(true); setError(null);
    try { const data = await usersService.getTelephonyExtensions({ instance, token }); setRows(data); setBlocked(false); setEditing(null); setName(""); setExtension(""); }
    catch { setError("Não foi possível carregar os ramais. Confira a preparação do cadastro no CRM."); setBlocked(true); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [token, instance, allowed]);
  async function save() {
    if (!token || busy || blocked) return;
    setBusy(true); setError(null);
    const context = { instance, token };
    try { if (editing) await usersService.changeTelephonyExtension(editing.id, { name, extension, version: editing.version }, context); else await usersService.createTelephonyExtension({ name, extension }, context); await load(); }
    catch { setBlocked(true); setError("Não foi possível confirmar a gravação. Atualize o cadastro antes de tentar novamente."); }
    finally { setBusy(false); }
  }
  async function remove(row: TelephonyExtension) {
    if (!token || !window.confirm(`Excluir o ramal ${row.name} (${row.extension})?`)) return;
    setBusy(true); setError(null);
    const context = { instance, token };
    try { await usersService.removeTelephonyExtension(row.id, row.version, context); await load(); }
    catch { setBlocked(true); setError("Não foi possível confirmar a exclusão. Atualize o cadastro."); }
    finally { setBusy(false); }
  }
  if (!allowed) return <Alert severity="warning">Cadastro restrito a administradores.</Alert>;
  return <section className="space-y-5 rounded-lg border border-slate-300 p-5 dark:border-slate-600">
    <h1 className="text-xl font-semibold">Ramais adicionais</h1><p className="text-sm">Cadastre ramais da mesma central sem operador no CRM, como Recepção e Financeiro. Este cadastro não cria o ramal no PABX.</p>
    {error && <Alert severity="warning">{error}</Alert>}
    <Button disabled={busy} onClick={() => void load()}>Atualizar cadastro</Button>
    <div className="flex flex-wrap gap-3"><TextField label="Nome" size="small" value={name} disabled={busy || blocked} onChange={event => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} /><TextField label="Ramal" size="small" value={extension} disabled={busy || blocked} onChange={event => setExtension(event.target.value)} slotProps={{ htmlInput: { maxLength: 16, inputMode: "numeric" } }} /><Button variant="contained" disabled={busy || blocked || !name.trim() || !/^[0-9]{1,16}$/.test(extension)} onClick={() => void save()}>{editing ? "Salvar alterações" : "Cadastrar"}</Button>{editing && <Button onClick={() => { setEditing(null); setName(""); setExtension(""); }}>Cancelar edição</Button>}</div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Nome</th><th className="p-2">Ramal</th><th className="p-2">Ações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2">{row.name}</td><td className="p-2">{row.extension}</td><td className="p-2"><Button disabled={busy || blocked} onClick={() => { setEditing(row); setName(row.name); setExtension(row.extension); }}>Editar</Button><Button color="error" disabled={busy || blocked} onClick={() => void remove(row)}>Excluir</Button></td></tr>)}</tbody></table>{!rows.length && <p className="p-2">Nenhum ramal adicional cadastrado.</p>}</div>
  </section>;
}
