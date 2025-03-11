"use client";
import React, { useId, useRef } from "react";
import { FaEye, FaEyeSlash, FaXmark } from "react-icons/fa6";

interface InputProps
	extends Omit<Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">, "width"> {
	title?: string;
	onChange?: (value: string) => void;
	width?: string;
}

export default function Input({ title, onChange, width, ...options }: InputProps) {
	const id = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (onChange) onChange(event.target.value);
		if (buttonRef.current) {
			buttonRef.current.hidden = event.target.value === "";
		}
	};

	const handleClear = () => {
		if (inputRef.current && buttonRef.current) {
			inputRef.current.value = "";
			buttonRef.current.hidden = true;
		}
	};

	const handleToggleHidden = () => {
		if (inputRef.current) {
			inputRef.current.type = inputRef.current.type === "password" ? "text" : "password";

		}
	}

	return (
		<div
			className="group relative flex select-none items-center gap-2 border-b border-slate-200 text-center focus-within:border-indigo-200"
			style={{ width: width || "max-content" }}
		>
			{title && (
				<label
					htmlFor={id}
					className="pointer-events-none ml-4 w-max truncate group-focus-within:text-indigo-200"
				>
					{title}:
				</label>
			)}
			<input
				id={id}
				className="peer min-w-32 bg-transparent py-2 pl-3 pr-9 outline-none focus:outline-none"
				ref={inputRef}
				onChange={handleChange}
				minLength={1}
				{...options}
			/>
			{
				options.type === "password" && (
					<button
						className="absolute right-10 rounded-full p-1 text-white transition-all hover:bg-blue-700 active:bg-blue-600 group-focus-within:text-indigo-200"
						onClick={handleToggleHidden}
						type="button"
						title="Limpar"
					>
						<FaEye />
					</button>
				)
			}
			<button
				className="absolute right-3 rounded-full p-1 text-white transition-all hover:bg-blue-700 active:bg-blue-600 group-focus-within:text-indigo-200"
				onClick={handleClear}
				type="button"
				ref={buttonRef}
				title="Limpar"
			>
				<FaXmark />
			</button>
		</div>
	);
}
