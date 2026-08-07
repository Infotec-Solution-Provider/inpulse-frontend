import ReadyMessagesProvider from "../(cruds)/ready-messages/ready-messages-context";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ReadyMessagesProvider>{children}</ReadyMessagesProvider>;
}
