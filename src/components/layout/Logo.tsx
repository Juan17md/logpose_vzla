import React from "react";
import { Bungee } from "next/font/google";

const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });

export type LogoVariant = "light" | "dark" | "icon" | "monochrome" | "map";

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
  width?: number | string;
  height?: number | string;
}

export default function Logo({ className = "", variant = "light", width, height }: LogoProps) {
  // SVG proportions
  const w = width || (variant === 'icon' || variant === 'map' ? 80 : 280);
  const h = height || (variant === 'icon' || variant === 'map' ? 80 : 130);

  const renderLogo = () => {
    switch (variant) {
      case "dark":
        return (
          <svg className={className} width={w} height={h} viewBox="0 0 360 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="75" cy="75" r="45" stroke="#FBBF24" strokeWidth="3" />
            <path d="M75 45L82 75L75 105L68 75L75 45Z" fill="white" />
            <circle cx="75" cy="75" r="5" fill="#EF4444" />
            <text x="135" y="75" fontFamily="var(--font-bungee)" fontSize="30" fill="white">LOGPOSE</text>
            <text x="135" y="105" fontFamily="var(--font-bungee)" fontSize="30" fill="#FBBF24">VZLA</text>
          </svg>
        );
       
      case "icon":
        return (
          <svg className={className} width={w} height={h} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="35" stroke="#FBBF24" strokeWidth="6" />
            <path d="M50 25L58 50L50 75L42 50L50 25Z" fill="white" />
            <circle cx="50" cy="50" r="6" fill="#EF4444" />
          </svg>
        );

      case "monochrome":
        return (
          <svg className={className} width={w} height={h} viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="30" r="20" stroke="currentColor" strokeWidth="2" />
            <path d="M25 15L29 30L25 45L21 30L25 15Z" fill="currentColor" />
            <text x="55" y="40" fontFamily="var(--font-bungee)" fontSize="20" fill="currentColor">LOGPOSE VZLA</text>
          </svg>
        );

      case "map":
        return (
          <svg className={className} width={w} height={h} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cuadrícula de Navegación */}
            <path d="M0 40H160M0 80H160M0 120H160M40 0V160M80 0V160M120 0V160" stroke="#E2E8F0" strokeWidth="1" opacity={0.3} />
            
            {/* Silueta Detallada de Venezuela */}
            <path d="M35 55C38 52 45 50 50 52C55 54 60 55 65 52C70 49 78 48 85 50C92 52 98 55 105 52C112 49 118 45 125 50C132 55 135 65 130 75C125 85 115 95 105 105C95 115 85 125 75 122C65 119 55 115 45 105C35 95 28 85 30 70C32 55 35 55 35 55Z" fill="#1E40AF" fillOpacity="0.1" stroke="#1E40AF" strokeWidth="2" />
            
            {/* Log Pose sobre el mapa */}
            <g transform="translate(80, 75) scale(0.6)">
                <circle cx="0" cy="0" r="45" fill="white" stroke="#334155" strokeWidth="4" />
                {/* Aguja */}
                <path d="M0 -35L10 0L0 35L-10 0L0 -35Z" fill="#EF4444" />
                <circle cx="0" cy="0" r="8" fill="#1E40AF" stroke="white" strokeWidth="2" />
                {/* Estrellas */}
                <circle cx="0" cy="-25" r="3" fill="#FBBF24" />
                <circle cx="17.5" cy="-17.5" r="3" fill="#FBBF24" />
                <circle cx="25" cy="0" r="3" fill="#FBBF24" />
                <circle cx="17.5" cy="17.5" r="3" fill="#FBBF24" />
                <circle cx="0" cy="25" r="3" fill="#FBBF24" />
                <circle cx="-17.5" cy="17.5" r="3" fill="#FBBF24" />
                <circle cx="-25" cy="0" r="3" fill="#FBBF24" />
                <circle cx="-17.5" cy="-17.5" r="3" fill="#FBBF24" />
            </g>
          </svg>
        );

      case "light":
      default:
        return (
          <svg className={className} width={w} height={h} viewBox="0 0 320 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="75" cy="75" r="45" fill="#F3F4F6" stroke="#334155" strokeWidth="4" />
            <path d="M75 30V120M30 75H120" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="75" cy="75" r="45" fill="url(#glass_grad)" fillOpacity="0.3" />
            <path d="M75 40L85 75L75 110L65 75L75 40Z" fill="#EF4444" />
            <circle cx="75" cy="75" r="8" fill="#1E40AF" stroke="white" strokeWidth="2" />
            <g transform="translate(75, 75)">
              <circle cx="0" cy="-22" r="2" fill="#FBBF24" />
              <circle cx="15.5" cy="-15.5" r="2" fill="#FBBF24" />
              <circle cx="22" cy="0" r="2" fill="#FBBF24" />
              <circle cx="15.5" cy="15.5" r="2" fill="#FBBF24" />
              <circle cx="0" cy="22" r="2" fill="#FBBF24" />
              <circle cx="-15.5" cy="15.5" r="2" fill="#FBBF24" />
              <circle cx="-22" cy="0" r="2" fill="#FBBF24" />
              <circle cx="-15.5" cy="-15.5" r="2" fill="#FBBF24" />
            </g>
            <text x="135" y="70" fontFamily="var(--font-bungee)" fontSize="28" fill="#1E40AF">LOGPOSE</text>
            <text x="135" y="100" fontFamily="var(--font-bungee)" fontSize="28" fill="#EF4444">VZLA</text>
            <rect x="135" y="110" width="125" height="4" fill="#FBBF24" rx="2" />
            
            <defs>
              <linearGradient id="glass_grad" x1="45" y1="45" x2="105" y2="105" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" />
                <stop offset="1" stopColor="#94A3B8" />
              </linearGradient>
            </defs>
          </svg>
        );
    }
  };

  return (
    <div className={`${bungee.variable} inline-block transition-transform duration-300 hover:-translate-y-1`}>
      {renderLogo()}
    </div>
  );
}