"use client";
import { useEffect } from "react";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { useOperatorPause } from "./provider";

/** Observe the existing phone; pause never connects, disconnects or replaces it. */
export function OperatorPausePhoneBridge() {
  const phone = useTelephony();
  const observe = useOperatorPause()?.observePhone;
  useEffect(() => {
    observe?.(phone.busy, phone.state.scheduleId);
    return () => observe?.(false, null);
  }, [observe, phone.busy, phone.state.scheduleId]);
  return null;
}
