import type { Metadata, Viewport } from "next";
import { Inter, Bungee } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "LogPose Vzla",
  description: "Tu sistema financiero personal premium.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LogPose Vzla",
  },
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
        <Toaster position="top-right" richColors mobileOffset={{ top: 52 }} />
      </body>
    </html>
  );
}