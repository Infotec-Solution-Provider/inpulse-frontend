interface ChatsMenuItemTagProps {
  name: string;
  color: string;
}

export default function ChatsMenuItemTag({ name }: ChatsMenuItemTagProps) {
  return <span className="attendance-conversation-tag">{name}</span>;
}
