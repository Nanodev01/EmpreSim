import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import RegistroServiceWorker from "./RegistroServiceWorker";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simulando Emprendedores | Simulador de Negocios y Finanzas",
  description: "Plataforma de simulación empresarial con Casos dinámicos y bots de Inteligencia Artificial.",
  applicationName: "Simulando Emprendedores",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Simulando", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <RegistroServiceWorker />
      </body>
    </html>
  );
}
