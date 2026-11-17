"use client";

import { Alert, Button, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/app/auth-context";
import customersService, { ScheduleAvailability } from "@/lib/services/customers.service";

import { availabilityError } from "./availability";
export { validateScheduleAvailability } from "./availability";
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export default function SchedulePicker({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { token } = useAuthContext();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(),1));
  const [day, setDay] = useState(() => value.slice(0,10) || localDate(new Date()));
  const [data, setData] = useState<ScheduleAvailability | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const from = localDate(month), to = localDate(new Date(month.getFullYear(), month.getMonth()+1,0));
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    if (token) customersService.setAuth(token);
    customersService.scheduleAvailability(from,to).then(result => { if (active) setData(result); }).catch(() => { if (active) setError("Não foi possível consultar a agenda e os turnos."); });
    return () => { active = false; };
  }, [from,to,token,attempt]);
  const days = Array.from({ length: Number(to.slice(-2)) }, (_,i) => `${from.slice(0,8)}${String(i+1).padStart(2,"0")}`);
  const occupied = data?.appointments.filter(a => a.startsWith(day+"T")) || [];
  const times = Array.from({ length: 96 }, (_,i) => `${String(Math.floor(i/4)).padStart(2,"0")}:${String(i%4*15).padStart(2,"0")}`);
  const chooseDay = (next: string) => { setDay(next); onChange(""); };
  return <section aria-label="Agenda do operador" className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <Button disabled={disabled} aria-label="Mês anterior" onClick={() => { setMonth(new Date(month.getFullYear(),month.getMonth()-1,1)); onChange(""); }}>‹</Button>
      <strong>{month.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</strong>
      <Button disabled={disabled} aria-label="Próximo mês" onClick={() => { setMonth(new Date(month.getFullYear(),month.getMonth()+1,1)); onChange(""); }}>›</Button>
    </div>
    {error && <Alert severity="error" action={<Button onClick={() => setAttempt(a=>a+1)}>Repetir</Button>}>{error}</Alert>}
    {!data && !error && <p role="status">Consultando agenda…</p>}
    {data && <>
      {!data.periods.length && <Alert severity="warning">Usuário sem expediente válido no cadastro de turnos. Solicite a configuração para agendar.</Alert>}
      <div className="grid grid-cols-7 gap-1">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><span key={d} className={`text-center text-xs ${d === "Dom" || d === "S�b" ? "rounded bg-yellow-100 font-semibold text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200" : ""}`}>{d}</span>)}
        {Array.from({length:month.getDay()},(_,i)=><span key={`blank${i}`} />)}
        {days.map(d => {
          const count = data.appointments.filter(a=>a.startsWith(d+"T")).length;
          const weekday = new Date(month.getFullYear(), month.getMonth(), Number(d.slice(-2))).getDay();
          const weekend = weekday === 0 || weekday === 6;
          const full = data.dailyLimit > 0 && count >= data.dailyLimit;
          return <button type="button" key={d} aria-pressed={day===d} disabled={disabled || d < localDate(new Date()) || !data.periods.length || (full && data.blockDailyLimit)} onClick={()=>chooseDay(d)} className={`rounded border p-1 text-sm disabled:opacity-40 ${weekend ? `bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200 ${day===d ? "border-blue-500 ring-2 ring-blue-500" : full ? "border-amber-500" : "border-yellow-400"}` : day===d ? "border-blue-500 bg-blue-100 text-slate-900" : full ? "border-amber-500" : "border-slate-300"}`}>
            {Number(d.slice(-2))}<small className="block text-[10px]">{count}{data.dailyLimit>0 ? `/${data.dailyLimit}` : " ag."}</small>
          </button>;
        })}
      </div>
      {day >= from && day <= to && <>
        <p className="text-sm">{day.split("-").reverse().join("/")} · Expediente: {data.periods.map(p=>`${p.start}–${p.end}`).join(", ") || "não configurado"}</p>
        <div className="grid max-h-36 grid-cols-4 gap-1 overflow-y-auto">
          {times.filter(t=>data.periods.some(p=>t>=p.start && t<p.end)).map(t=>{
            const at=day+"T"+t, busy=occupied.includes(at);
            return <button key={t} type="button" disabled={disabled || !!availabilityError(data,at)} aria-pressed={value===at} onClick={()=>onChange(at)} className={`rounded border p-1 text-xs disabled:opacity-40 ${value===at ? "bg-blue-600 text-white" : busy ? "border-amber-500 bg-amber-100 text-slate-900" : "border-emerald-500"}`}>{t}{busy ? " ocupado" : " livre"}</button>;
          })}
        </div>
        <TextField type="time" label="Horário exato" value={value.startsWith(day)?value.slice(11):""} disabled={disabled} slotProps={{inputLabel:{shrink:true}}} onChange={e=> { const next=day+"T"+e.target.value; if (!availabilityError(data,next)) onChange(next); else onChange(""); }} />
        {value && <p role="status" className="text-sm">Selecionado: {value.replace("T"," às ")}</p>}
      </>}
    </>}
  </section>;
}


