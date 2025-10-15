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
		// Monitor card dynamic colors
		'border-amber-500',
		'border-cyan-500',
		'border-green-500',
		'border-orange-500',
		'border-pink-500',
		'border-violet-500',
		'bg-amber-700/5',
		'bg-cyan-700/5',
		'bg-green-700/5',
		'bg-orange-700/5',
		'bg-pink-700/5',
		'bg-violet-700/5',
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
	],
	plugins: [],
} satisfies Config;
