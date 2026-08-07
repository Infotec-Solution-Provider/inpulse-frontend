import AuthProvider from "@/app/auth-context";
import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import type React from "react";
import { Bounce, ToastContainer } from "react-toastify";
import { PwaRegistration } from "./pwa-registration";
import "./globals.css";

const firaSans = Fira_Sans({
  weight: ["400", "500", "600"],
  variable: "--font-fira-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InPulse",
  description: "CRM InPulse com atendimento, notificacoes e operacao em tempo real.",
  applicationName: "InPulse",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InPulse",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body
        suppressHydrationWarning
        className={`${firaSans.variable} relative bg-fixed text-slate-200`}
      >
        <PwaRegistration />
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
