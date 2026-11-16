import { useRef, useState } from "react";
import { useAppContext } from "./doubles";
export function AttendanceDrawer(props: any) {
  return props.open ? <aside aria-label="Attendance fixture"><button onClick={props.onStartDial}>Start actual card</button><button onClick={props.onOpenFinishModal}>Finish actual card</button></aside> : null;
}
export function FinishModal({ onConfirm }: any) {
  const { closeModal } = useAppContext(), operation = useRef(crypto.randomUUID()), [error, setError] = useState("");
  return <section role="dialog" aria-label="Finalização fixture"><button onClick={() => { void onConfirm(9, undefined, operation.current, new Date().toISOString()).catch((error: Error) => setError(error.message)); }}>Confirm actual finish</button><p role="alert">{error}</p><button onClick={closeModal}>Close finish fixture</button></section>;
}
