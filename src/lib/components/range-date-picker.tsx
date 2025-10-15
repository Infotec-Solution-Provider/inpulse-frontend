"use client";
import { useState } from "react";
import { TextField } from "@mui/material";

export interface RangeDatePickerProps {
  initialFrom?: string;
  initialTo?: string;
  onChange?: (range: { from: string; to: string }) => void;
}

export default function RangeDatePicker({
  initialFrom = "",
  initialTo = "",
  onChange,
}: RangeDatePickerProps) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const handleFromChange = (value: string) => {
    // Se "from" for maior que "to", ajusta "to" para ser igual a "from"
    const newFrom = value;
    let newTo = to;
    if (to && value > to) {
      newTo = value;
      setTo(newTo);
    }
    setFrom(newFrom);
    onChange?.({ from: newFrom, to: newTo });
  };

  const handleToChange = (value: string) => {
    // Se "to" for menor que "from", ajusta "from" para ser igual a "to"
    const newTo = value;
    let newFrom = from;
    if (from && value < from) {
      newFrom = value;
      setFrom(newFrom);
    }
    setTo(newTo);
    onChange?.({ from: newFrom, to: newTo });
  };

  return (
    <div className="flex items-center gap-2">
      <TextField
        type="date"
        size="small"
        value={from}
        onChange={(e) => handleFromChange(e.target.value)}
        fullWidth
      />
      <span>-</span>
      <TextField
        type="date"
        size="small"
        value={to}
        onChange={(e) => handleToChange(e.target.value)}
        fullWidth
      />
    </div>
  );
}
