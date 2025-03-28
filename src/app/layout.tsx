import type { Metadata } from "next";
import type React from "react";
import { Fira_Sans } from "next/font/google";
import "./globals.css";
import { Bounce, ToastContainer } from "react-toastify";
import AuthProvider from "@/lib/contexts/auth.context";

const firaSans = Fira_Sans({
	weight: ["400", "500", "600"],
	variable: "--font-fira-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "InPulse: Exportar Conversas",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-br">
			<body className={`${firaSans.variable} relative text-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 to-80% bg-fixed`}>
				<AuthProvider>
					{children}
					<ToastContainer
						position="bottom-center"
						autoClose={6000}
						newestOnTop
						draggable
						theme="dark"
						transition={Bounce}
					/>
				</AuthProvider>
			</body>
		</html>
	);
}
