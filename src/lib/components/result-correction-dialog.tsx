"use client";
import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, MenuItem, TextField } from "@mui/material";
import { TelephonyDialogTitle } from "@/lib/telephony/dialog-title";
import customersService from "@/lib/services/customers.service";
import type { AuthRequestConfig } from "@/lib/auth-session";

type Detail = { id:number; resultId:number; customerName:string; proposalCount:number; results:{id:number;name:string}[] };
export default function ResultCorrectionDialog({scheduleId,onClose,onSaved}:{scheduleId:number;onClose:()=>void;onSaved:()=>void}) {
  const [detail,setDetail]=useState<Detail|null>(null), [result,setResult]=useState(""), [error,setError]=useState(""), [saving,setSaving]=useState(false), [uncertain,setUncertain]=useState(false);
  useEffect(()=>{let active=true; customersService.ax.get<{data:Detail}>(`/api/customers/monitor/telephony/schedules/${scheduleId}/result`).then(r=>{if(active){setDetail(r.data.data);setResult(String(r.data.data.resultId));}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[scheduleId]);
  async function save(){
    if (!detail) return;
    setSaving(true);setError("");
    try {await customersService.ax.patch(`/api/customers/monitor/telephony/schedules/${scheduleId}/result`,{oldResult:detail.resultId,newResult:Number(result),proposalCount:detail.proposalCount},{skipAuthRefresh:true} as AuthRequestConfig);onSaved();}
    catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");setUncertain(true)} finally {setSaving(false)}
  }
  return <Dialog open onClose={saving?undefined:onClose} fullWidth maxWidth="sm" aria-labelledby="result-correction-title">
    <TelephonyDialogTitle id="result-correction-title" onClose={onClose} closeDisabled={saving}>
      Alterar resultado da ficha
    </TelephonyDialogTitle>
    <DialogContent className="space-y-4">
      {error && <Alert severity="error">{error}</Alert>}
      {!detail && !error && <CircularProgress size={24}/>}
      {detail && <><p>Cliente: {detail.customerName} · Ficha #{detail.id}</p><TextField select fullWidth label="Resultado" value={result} onChange={e=>setResult(e.target.value)}>{detail.results.map(r=><MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}</TextField><Alert severity={detail.proposalCount?"warning":"info"}>Ao alterar o resultado, {detail.proposalCount ? `${detail.proposalCount} proposta(s) vinculada(s) serão excluídas` : "não há propostas vinculadas a excluir"}. O histórico de ligações permanece como registrado.</Alert></>}
    </DialogContent><DialogActions><Button onClick={save} disabled={!detail || saving || uncertain || !result || Number(result)===detail.resultId} variant="contained">{saving?"Salvando…":"Confirmar alteração"}</Button></DialogActions></Dialog>;
}
