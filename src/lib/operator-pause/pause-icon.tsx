import type { LucideIcon, LucideProps } from "lucide-react";

export function UiIcon({ icon: Icon, scale = "row", ...props }: LucideProps & { icon: LucideIcon; scale?: "row" | "toolbar" | "metadata" }) {
  return <Icon {...props} size={scale === "metadata" ? 16 : scale === "toolbar" ? 20 : 18} strokeWidth={2}
    focusable="false" aria-hidden={props["aria-hidden"] ?? !props["aria-label"]} />;
}
