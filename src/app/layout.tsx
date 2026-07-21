import type { Metadata, Viewport } from "next";
import { Inter, Bungee } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AvisosPWA from "@/components/pwa/AvisosPWA";
import MotionProvider from "@/components/providers/MotionProvider";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "LogPose Vzla",
  description: "Tu sistema financiero personal premium.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LogPose Vzla",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon",
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
        <MotionProvider>
          {children}
        </MotionProvider>
        <Toaster position="top-right" richColors mobileOffset={{ top: 52 }} />
        <AvisosPWA />
      </body>
    </html>
  );
}