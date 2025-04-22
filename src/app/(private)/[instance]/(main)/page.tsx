"use client"
import { Modal } from "@mui/material";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import { useContext } from "react";
import { AppContext } from "../app-context";

export default function Home() {
  const { modal, closeModal } = useContext(AppContext);
  return (
    <div className="box-border grid grid-cols-[24rem_1fr] grid-rows-1 gap-4 px-4 py-4">
      <ChatsMenu />
      <Chat
        name="Maria Silva"
        company="Empresa ABC"
        phone="1234567890"
        cnpj="12345678901234"
        id={1}
        erpId="ERP123"
        startDate={new Date("2025-04-16")}
        urgency="NORMAL"
      />
      <Modal open={!!modal} onClose={closeModal} className="flex items-center justify-center">
        <>{modal}</>
      </Modal>
    </div>
  );
}
