interface ChatsMenuItemTagProps {
  name: string;
  color: string;
}

export default function ChatsMenuItemTag({ name, color }: ChatsMenuItemTagProps) {
  return (
    <div
      className={`box-border w-max rounded-sm px-1 py-0.5 text-xs text-slate-200`}
      style={{ backgroundColor: color }}
    >
      {name}
    </div>
  );
}
