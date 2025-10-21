import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	safelist: [
		// Border width
		'border',
		'border-l-8',
		
		// Monitor card - border-left colors (main card borders)
		'border-l-blue-600',
		'border-l-gray-500',
		'border-l-purple-600',
		'border-l-indigo-600',
		'border-l-teal-600',
		'border-l-amber-600',
		
		// Regular border colors (all sides)
		'border-gray-200',
		'border-amber-200',
		'border-amber-500',
		'border-cyan-500',
		'border-green-500',
		'border-orange-500',
		'border-pink-500',
		'border-violet-500',
		
		// Dark mode border colors
		'dark:border-gray-700',
		'dark:border-amber-800',
		
		// Border radius
		'rounded-lg',
		'rounded-s-md',
		'rounded-full',
		
		// Padding for badges
		'p-1.5',
		'px-2.5',
		'py-1',
		
		// Background colors
		'bg-blue-50/40',
		'bg-blue-950/10',
		'bg-gray-50/40',
		'bg-gray-950/10',
		'bg-purple-50/60',
		'bg-purple-950/20',
		'bg-purple-100',
		'bg-purple-900/40',
		'bg-indigo-50/40',
		'bg-indigo-50/60',
		'bg-indigo-950/10',
		'bg-indigo-950/20',
		'bg-indigo-100',
		'bg-indigo-900/40',
		'bg-teal-50/40',
		'bg-teal-950/10',
		'bg-amber-50/40',
		'bg-amber-950/10',
		'bg-amber-700/5',
		'bg-cyan-700/5',
		'bg-green-700/5',
		'bg-orange-700/5',
		'bg-pink-700/5',
		'bg-violet-700/5',
		
		// Text colors
		'text-blue-700',
		'text-blue-400',
		'text-gray-700',
		'text-gray-400',
		'text-purple-700',
		'text-purple-400',
		'text-purple-300',
		'text-indigo-700',
		'text-indigo-400',
		'text-indigo-300',
		'text-teal-700',
		'text-teal-400',
		'text-amber-700',
		'text-amber-400',
		'text-amber-800',
		'text-cyan-800',
		'text-green-800',
		'text-orange-800',
		'text-pink-800',
		'text-violet-800',
		'dark:text-amber-200',
		'dark:text-cyan-200',
		'dark:text-green-200',
		'dark:text-orange-200',
		'dark:text-pink-200',
		'dark:text-violet-200',
		
		// Border colors for groups and schedules
		'border-amber-200',
		'dark:border-amber-800',
	],
	plugins: [],
} satisfies Config;
