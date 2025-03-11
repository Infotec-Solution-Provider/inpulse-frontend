import React, { ReactNode } from "react";

interface ButtonProps
	extends Omit<
		React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
		"className"
	> {
	children: ReactNode;
	width?: string;
}

export default function Button({ children, ...options }: ButtonProps) {
	return (
		<button
			className="group rounded-md bg-indigo-900 p-2 text-center text-white hover:bg-indigo-800 active:bg-indigo-700"
			{...options}
			style={{ width: options.width || "max-content", height: "max-content" }}
		>
			{children}
		</button>
	);
}
