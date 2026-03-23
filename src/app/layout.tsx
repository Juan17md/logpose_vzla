import type { Metadata } from "next";
import { Inter, Bungee } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LogPose Vzla",
  description: "Tu sistema financiero personal premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bungee.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}