"use client";
import { Button } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import CloseIcon from "@mui/icons-material/Close";

interface QRModalProps {
  qr: string;
  phone: string;
  onClose: () => void;
}

export default function QRModal({ qr, phone, onClose }: QRModalProps) {
  return (
    <dialog className="flex h-max w-max flex-col items-center gap-2 rounded-md bg-slate-800 px-6 py-4">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-lg"> QrCode: {phone} </h1>
        <Button onClick={onClose}>
          <CloseIcon sx={{ pointerEvents: "none" }} />
        </Button>
      </div>
      <QRCodeSVG value={qr} height={320} width={320} />
    </dialog>
  );
}
