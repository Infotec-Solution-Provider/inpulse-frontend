import React, { ReactNode } from "react";
import { COLOR_VARIANTS, ColorVariant } from "./variants";

interface ButtonProps
	extends Omit<
		React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
		"className"
	> {
	children: ReactNode;
	width?: string;
	color?: ColorVariant;
}


export default function Button({ children, color, ...options }: ButtonProps) {
	const { text, inherit, active, hover } = COLOR_VARIANTS[color || "indigo-dark"];

	return (
		<button
			className={
				`group rounded-md ${inherit} p-2 text-center text-white ${hover} ${active} ${text}`
			}
			{...options}
			style={{ width: options.width || "max-content", height: "max-content" }}
		>
			{children}
		</button>
	);
}
