import RangeDatePicker, { RangeDatePickerProps } from "./range-date-picker";

interface RangeDateFieldProps extends RangeDatePickerProps {
  label: string;
}

export default function RangeDateField(props: RangeDateFieldProps) {
  return (
    <div>
      <h3 className="mb-1 text-slate-800 dark:text-slate-200 font-semibold">{props.label}</h3>
      <RangeDatePicker
        initialFrom={props.initialFrom}
        initialTo={props.initialTo}
        onChange={props.onChange}
      />
    </div>
  );
}
