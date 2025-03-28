export type SizeVariant = "sm" | "md" | "lg" | "1/2" | "1/3" | "1/4";
export type ColorVariant = "indigo-dark" | "indigo-light" | "orange-dark" | "orange-light" | "red-dark" | "red-light" | "slate-dark" | "slate-light";
type ElementState = "inherit" | "active" | "hover" | "focus" | "group-focus-within" | "text";

export const SIZE_VARIANTS: Record<SizeVariant, string> = {
    sm: "w-40",
    md: "w-56",
    lg: "w-72",
    "1/2": "w-1/2",
    "1/3": "w-1/3",
    "1/4": "w-1/4",
};

export const COLOR_VARIANTS: Record<ColorVariant, Record<ElementState, string>> = {
    "indigo-dark": {
        inherit: "bg-indigo-900",
        hover: "hover:bg-indigo-800",
        active: "active:bg-indigo-700",
        focus: "focus:bg-indigo-700",
        "group-focus-within": "group-focus-within:text-indigo-700",
        text: "text-indigo-200",
    },
    "indigo-light": {
        inherit: "bg-indigo-100",
        hover: "hover:bg-indigo-200",
        active: "active:bg-indigo-300",
        focus: "focus:bg-indigo-300",
        "group-focus-within": "group-focus-within:text-indigo-300",
        text: "text-indigo-900",
    },
    "orange-dark": {
        inherit: "bg-orange-900",
        hover: "hover:bg-orange-800",
        active: "active:bg-orange-700",
        focus: "focus:bg-orange-700",
        "group-focus-within": "group-focus-within:text-orange-700",
        text: "text-orange-200",
    },
    "orange-light": {
        inherit: "bg-orange-100",
        hover: "hover:bg-orange-200",
        active: "active:bg-orange-300",
        focus: "focus:bg-orange-300",
        "group-focus-within": "group-focus-within:text-orange-300",
        text: "text-orange-900",
    },
    "red-dark": {
        inherit: "bg-red-900",
        hover: "hover:bg-red-800",
        active: "active:bg-red-700",
        focus: "focus:bg-red-700",
        "group-focus-within": "group-focus-within:text-red-700",
        text: "text-red-200",
    },
    "red-light": {
        inherit: "bg-red-100",
        hover: "hover:bg-red-200",
        active: "active:bg-red-300",
        focus: "focus:bg-red-300",
        "group-focus-within": "group-focus-within:text-red-300",
        text: "text-red-900",
    },
    "slate-dark": {
        inherit: "bg-slate-900",
        hover: "hover:bg-slate-800",
        active: "active:bg-slate-700",
        focus: "focus:bg-slate-700",
        "group-focus-within": "group-focus-within:text-slate-700",
        text: "text-slate-200",
    },
    "slate-light": {
        inherit: "bg-slate-100",
        hover: "hover:bg-slate-200",
        active: "active:bg-slate-300",
        focus: "focus:bg-slate-300",
        "group-focus-within": "group-focus-within:text-slate-300",
        text: "text-slate-900",
    },
};