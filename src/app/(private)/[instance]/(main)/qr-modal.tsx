"use client";
import { Button, IconButton } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../app-context";

interface QRModalProps {
  qr: string;
  phone: string;
}

export default function QRModal({ qr, phone }: QRModalProps) {
  const { closeModal } = useContext(AppContext);

  return (
    <div className="flex h-max w-max flex-col items-center gap-2 rounded-md bg-slate-400 px-6 py-4 text-slate-800">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-lg font-semibold"> QrCode: {phone} </h1>
        <IconButton onClick={closeModal}>
          <CloseIcon sx={{ pointerEvents: "none" }} />
        </IconButton>
      </div>
      <QRCodeSVG value={qr} height={480} width={480} />
    </div>
  );
}
