"use client";
import {FaAngleDown, FaAngleUp, FaXmark} from "react-icons/fa6";
import {FocusEventHandler, useEffect, useRef, useState} from "react";

interface SelectProps {
    options: Record<string, string>;
    title?: string;
    onChange?: (value: string | null) => void;
    name: string;
    width?: string;
    required?: boolean;
}

export default function Select({options, title, onChange, name, width, required}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!!onChange) onChange(selected ? options[selected] : null);
    }, [selected, onChange]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelection = (value: string) => {
        if (value !== selected) {
            setSelected(value);
        }
        setIsOpen(false);
    };

    const handleFocus: FocusEventHandler<HTMLInputElement> = () => setIsOpen(true);

    const handleClear = () => {
        setSelected(null);
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div
            className="group relative flex select-none items-center border-b border-slate-200 text-center focus-within:border-indigo-200"
            style={{width: width || "max-content"}}
            ref={componentRef}
        >
            {title && (
                <label className="pointer-events-none mx-2 block w-max group-focus-within:text-indigo-200">
                    {title}:
                </label>
            )}
            <input
                name={name}
                value={selected || ""}
                className="w-full bg-transparent px-3 py-2 caret-transparent outline-none focus:outline-none"
                onFocus={handleFocus}
                minLength={1}
                autoComplete="off"
                autoCorrect="off"
                required={!!required}
                readOnly
            />
            <ul
                className="absolute -bottom-1 left-0 z-10 max-h-60 w-full translate-y-full snap-y overflow-y-auto rounded-md bg-neutral-700 shadow-sm shadow-black"
                hidden={!isOpen}
            >
                {Object.entries(options).map(([text, value]) => (
                    <li
                        key={value}
                        className="cursor-pointer snap-center truncate px-2 py-1 text-sm first:pt-2 last:pb-2 hover:bg-slate-600"
                        onClick={() => handleSelection(text)}
                    >
                        {text}
                    </li>
                ))}
            </ul>
            <div className="relative flex w-max items-center rounded-r-md px-2 group-focus-within:text-indigo-200">
                <button
                    className="absolute -left-4 rounded-full p-1 text-sm transition-all hover:bg-neutral-700 active:bg-neutral-600"
                    onClick={handleClear}
                    type="button"
                    hidden={selected === null}
                >
                    <FaXmark/>
                </button>
                <button
                    className="rounded-full p-1 transition-all hover:bg-neutral-700 active:bg-neutral-600"
                    onClick={handleToggle}
                    type="button"
                >
                    {isOpen ? <FaAngleUp/> : <FaAngleDown/>}
                </button>
            </div>
        </div>
    );
}
