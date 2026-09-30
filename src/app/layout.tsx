import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JD-SERVICES MANAGEMENT — CRM & Facturation",
  description: "Plateforme de gestion commerciale, proformas et facturation légale — JD-Services Automobile & Réseau",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full bg-[#F5F7FA] text-[#111827] antialiased">
        {children}
      </body>
    </html>
  );
}
