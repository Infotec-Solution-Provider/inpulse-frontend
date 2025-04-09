interface ChatsMenuItemTagProps {
  name: string;
  color: string;
}

export default function ChatsMenuItemTag({ name, color }: ChatsMenuItemTagProps) {
  return (
    <div
      className={`box-border w-max rounded-sm px-2 py-0.5 text-[0.625rem] font-semibold text-white`}
      style={{ backgroundColor: color }}
    >
      {name}
    </div>
  );
}
