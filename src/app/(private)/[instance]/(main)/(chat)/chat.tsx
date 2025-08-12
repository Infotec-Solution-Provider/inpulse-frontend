"use client";
import ChatHeader, { ChatContactInfoProps } from "./chat-header";
import ChatSendMessageArea from "./chat-send-message-area";
import ChatMessagesList from "./chat-messages-list";
import { ChatContext } from "./chat-context";
import { useContext } from "react";
import ChatAttachmentPreview from "./chat-attachment-preview";
import { useWhatsappContext } from "../../whatsapp-context";

// DEBUG: arquivo chat.tsx carregado
console.log('[Chat] Arquivo carregado');

// DEBUG: arquivo chat.tsx carregado
console.log('[Chat] Arquivo carregado');

export default function Chat({ avatarUrl, name, customerName, phone }: ChatContactInfoProps) {
  console.log('[Chat] Componente montando', { avatarUrl, name, customerName, phone });

  const { state, dispatch, isMobilePreviewOpen } = useContext(ChatContext);
  const { currentChat } = useWhatsappContext();

  // LOG VISUAL: mostra currentChat no topo do chat
  const logStyle: React.CSSProperties = { color: 'red', fontSize: 10, wordBreak: 'break-all', maxWidth: 300 };


  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      dispatch({ type: "attach-file", file });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          dispatch({ type: "attach-file", file });
        }
      }
    }
  };

  return (
    <div className="relative h-screen flex flex-col bg-white text-black dark:bg-slate-900 dark:text-white shadow-md overflow-hidden">
      {/* Header for desktop */}
      {!isMobilePreviewOpen && (
        <div className="hidden md:block flex-shrink-0">
          <ChatHeader
            avatarUrl={avatarUrl}
            name={name}
            customerName={customerName}
            phone={phone}
          />
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header for mobile - fixed at the top */}
        {!isMobilePreviewOpen && (
          <>
            <div className="md:hidden fixed top-0 left-0 right-0 z-50">
              <ChatHeader
                avatarUrl={avatarUrl}
                name={name}
                customerName={customerName}
                phone={phone}
              />
            </div>
            
            {/* Spacer for mobile header */}
            <div className="md:hidden h-[100px] flex-shrink-0"></div>
          </>
        )}
        
        {/* Messages area */}
        <div 
          className="flex-1 w-full overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPaste={handlePaste}
        >
          <div className="h-full w-full overflow-y-auto">
            <div className="min-h-full w-full">
              <ChatMessagesList />
              {state?.file && !state.sendAsAudio && (
                <div className="mt-4 px-2 pb-4">
                  <ChatAttachmentPreview file={state.file} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer for mobile */}
        {!isMobilePreviewOpen && (
          <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700">
              <ChatSendMessageArea />
              {/* Add safe area for devices with notches */}
              <div className="h-[env(safe-area-inset-bottom,0px)] bg-white dark:bg-slate-900"></div>
            </div>
            
            {/* Spacer for mobile footer - now dynamic based on keyboard state */}
            <div 
              className="md:hidden flex-shrink-0 transition-all duration-300 ease-in-out"
              style={{
                height: 'var(--keyboard-height, 54px)'
              }}
            ></div>
            
            {/* Footer for desktop */}
            <div className="hidden md:block flex-shrink-0">
              <ChatSendMessageArea />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
