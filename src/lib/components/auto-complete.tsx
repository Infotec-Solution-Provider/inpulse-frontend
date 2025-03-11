"use client";
import { FaAngleDown, FaAngleUp, FaXmark } from "react-icons/fa6";
import { ChangeEventHandler, FocusEventHandler, ReactNode, useEffect, useRef, useState, } from "react";
import { motion } from "motion/react";

interface SelectProps {
    options: Record<string, string>;
    title?: string;
    onChange?: (value: string | null) => void;
    name: string;
    width?: string;
    required?: boolean;
    placeholder?: string;
    rightIcon?: ReactNode;
    maxOptions?: number;
}

export default function AutoComplete({
    options,
    title,
    onChange,
    name,
    width,
    required,
    placeholder,
    rightIcon,
    maxOptions
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [selected, setSelected] = useState<string | null>(null);

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!!onChange) onChange(selected ? options[selected] : null);
    }, [selected, onChange]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
                setIsOpen(false);

                if (filter === "") {
                    setSelected(null);
                } else if (Object.keys(options).includes(filter)) {
                    setSelected(filter);
                } else {
                    setFilter("");
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [filter]);

    const handleSelection = (value: string) => {
        if (value !== selected) {
            setSelected(value);
            setFilter(value);
        }
        setIsOpen(false);
    };

    const handleFocus: FocusEventHandler<HTMLInputElement> = () => setIsOpen(true);

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        if (e.target.value !== filter) {
            setFilter(e.target.value);
        }
    };

    const handleClear = () => {
        setFilter("");
        setSelected(null);
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div
            className="group relative flex select-none items-center border-b border-slate-200 text-center focus-within:border-indigo-200"
            style={{ width: width || "max-content" }}
            ref={componentRef}
        >
            {title && (
                <label className="pointer-events-none mx-2 block w-max group-focus-within:text-indigo-200">
                    {title}:
                </label>
            )}
            <input
                name={name}
                type="hidden"
                value={selected ? options[selected] : ""}
            />
            <input
                value={filter}
                className="w-full bg-transparent px-3 py-2 outline-none"
                onFocus={handleFocus}
                onChange={handleChange}
                minLength={1}
                autoComplete="off"
                autoCorrect="off"
                placeholder={placeholder || ""}
                required={!!required}
            />
            <ul
                className="absolute -bottom-1 left-0 z-10 max-h-60 w-full translate-y-full snap-y overflow-y-auto rounded-md bg-neutral-700 shadow-sm shadow-black"
                hidden={!isOpen}
            >
                {
                    Object.entries(options)
                        .filter(([text]) => text.toLowerCase().includes(filter.toLowerCase()))
                        .slice(0, maxOptions || Object.keys(options).length)
                        .map(([text, value]) => (
                            <li
                                key={value}
                                className="cursor-pointer snap-center truncate px-4 py-1 text-sm first:pt-2 last:pb-2 hover:bg-slate-600 text-left"
                                onClick={() => handleSelection(text)}
                                hidden={!text.toLowerCase().includes(filter.toLowerCase())}
                            >
                                {text}
                            </li>
                        ))
                }
            </ul>
            <div
                className="relative flex w-max items-center gap-2 rounded-r-md px-2 group-focus-within:text-indigo-200">
                <button
                    className="absolute -left-4 rounded-full p-1 text-sm transition-all hover:bg-blue-700 active:bg-blue-600"
                    onClick={handleClear}
                    type="button"
                    hidden={!filter}
                >
                    <FaXmark />
                </button>

                {rightIcon || (
                    <button
                        className="rounded-full p-1 transition-all hover:bg-blue-700 active:bg-blue-600"
                        onClick={handleToggle}
                        type="button"
                    >
                        {isOpen ? <FaAngleUp /> : <FaAngleDown />}
                    </button>
                )}
            </div>
        </div>
    );
}
