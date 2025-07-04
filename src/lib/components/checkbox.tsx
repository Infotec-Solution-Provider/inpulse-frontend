import { ReactNode } from "react";

interface LabeledCheckboxProps {
  children: ReactNode;
  id: string;
  value?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function CheckBox({ children, id, value, onChange }: LabeledCheckboxProps) {
  return (
    <div className="flex items-center gap-1 justify-start w-max">
      <input type="checkbox" id={id} className="peer" checked={value} onChange={onChange} />
      <label
        htmlFor={id}
        className=" text-slate-800 dark:text-slate-200  peer-checked:text-indigo-700 dark:peer-checked:text-indigo-400"
      >
        {children}
      </label>
    </div>
  );
}
