import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssistantMarkdownProps {
	content: string;
}

export default function AssistantMarkdown({ content }: AssistantMarkdownProps) {
	return (
		<div className="min-w-0 text-sm leading-7 text-slate-700 dark:text-slate-200">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => <h1 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">{children}</h1>,
					h2: ({ children }) => <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-50">{children}</h2>,
					h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{children}</h3>,
					p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
					ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
					ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
					li: ({ children }) => <li className="pl-1">{children}</li>,
					blockquote: ({ children }) => (
						<blockquote className="mb-3 border-l-4 border-slate-300 bg-slate-100/80 px-4 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200">
							{children}
						</blockquote>
					),
					a: ({ href, children }) => (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-sky-700 underline underline-offset-4 transition-colors hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{children}
						</a>
					),
					pre: ({ children }) => (
						<pre className="mb-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[13px] leading-6 text-slate-100 dark:border-slate-700 last:mb-0">
							{children}
						</pre>
					),
					code: ({ className, children }) => {
						const isInline = !className && !String(children ?? "").includes("\n");
						if (!isInline) {
							return <code className={className}>{children}</code>;
						}
						return (
							<code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
								{children}
							</code>
						);
					},
					table: ({ children }) => (
						<div className="mb-3 overflow-x-auto last:mb-0">
							<table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-slate-200 text-left text-[13px] dark:border-slate-700">
								{children}
							</table>
						</div>
					),
					thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-800/80">{children}</thead>,
					tr: ({ children }) => <tr className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">{children}</tr>,
					th: ({ children }) => (
						<th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-50">
							{children}
						</th>
					),
					td: ({ children }) => (
						<td className="border-b border-slate-200 px-3 py-2 align-top text-slate-700 dark:border-slate-700 dark:text-slate-200">
							{children}
						</td>
					),
					hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}