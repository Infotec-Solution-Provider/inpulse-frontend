"use client"; // importante no app router do Next.js para componentes com hooks

import Linkify from "linkify-react";

interface LinkifiedTextProps {
  text: string;
}

export default function LinkifiedText({ text }: LinkifiedTextProps) {
  const options = {
    defaultProtocol: "https",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "text-blue-600 underline break-words",
  };

  return <Linkify options={options}>{text}</Linkify>;
}
