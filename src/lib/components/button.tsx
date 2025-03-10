import React, { ReactNode } from "react";

interface ButtonProps
	extends Omit<
		React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
		"className"
	> {
	children: ReactNode;
}

export default function Button({ children, ...options }: ButtonProps) {
	return (
		<button
			className="group rounded-md bg-slate-900 p-2 text-center text-white hover:bg-slate-700"
			{...options}
		>
			{children}
		</button>
	);
}
