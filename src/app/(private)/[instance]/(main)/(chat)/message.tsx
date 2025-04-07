interface MessageProps {
  style: "received" | "sent" | "system";
  text: string;
  date: Date;
}

const variants = {
  received: "bg-slate-900 mr-auto rounded-bl-none",
  sent: "bg-green-900 ml-auto rounded-br-none",
  system: "bg-yellow-800 mx-auto",
};

export default function Message({ style, text, date }: MessageProps) {
  return (
    <li className={`flex items-center gap-2 p-2 ${variants[style]} w-max max-w-[66%] rounded-md`}>
      <div className="flex flex-col gap-1">
        <p className="text-slate-200">{text}</p>
        <p className="text-xs text-slate-300">{date.toLocaleString()}</p>
      </div>
    </li>
  );
}
