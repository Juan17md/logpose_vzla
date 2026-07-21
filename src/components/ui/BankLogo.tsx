"use client";

import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BankLogoProps {
    bankId: string;
    className?: string;
    size?: number;
}

/**
 * Mapeo oficial de logos de alta resolución para bancos y servicios comunes.
 */
const BANCO_LOGOS_REALES: Record<string, string> = {
    binance: "https://upload.wikimedia.org/wikipedia/commons/5/57/Binance_Logo.png",
    zelle: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Zelle_logo.svg",
    paypal: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
    zinli: "https://www.zinli.com/favicon.ico",
    reserve: "https://getreserve.com/favicon.ico",
    bofa: "https://www.bankofamerica.com/favicon.ico",
    chase: "https://www.chase.com/favicon.ico",
    banesco: "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.banesco.com&size=64",
    mercantil: "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.mercantilbanco.com&size=64",
    provincial: "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.provincial.com&size=64",
    venezuela: "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.bancodevenezuela.com&size=64",
    bdv: "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.bancodevenezuela.com&size=64",
};

/**
 * Mapeo de IDs de banco a dominios oficiales para la extracción de logos vía URL Google Favicon.
 */
const getBankDomain = (id: string): string | null => {
    const bank = id.toLowerCase();
    if (bank.includes("banesco")) return "www.banesco.com";
    if (bank.includes("mercantil")) return "www.mercantilbanco.com";
    if (bank.includes("venezuela") || bank.includes("bdv")) return "www.bancodevenezuela.com";
    if (bank.includes("provincial") || bank.includes("bbva")) return "www.provincial.com";
    if (bank.includes("binance")) return "www.binance.com";
    if (bank.includes("zelle")) return "www.zellepay.com";
    if (bank.includes("paypal")) return "www.paypal.com";
    if (bank.includes("bancaribe")) return "www.bancaribe.com.ve";
    if (bank.includes("banplus")) return "www.banplus.com";
    if (bank.includes("bofa") || bank.includes("bank of america")) return "www.bankofamerica.com";
    if (bank.includes("chase")) return "www.chase.com";
    if (bank.includes("venmo")) return "www.venmo.com";
    return null;
};

export default function BankLogo({ bankId, className, size = 32 }: BankLogoProps) {
    const [imgAttempt, setImgAttempt] = useState(0);
    const domain = getBankDomain(bankId);
    const realLogoUrl = BANCO_LOGOS_REALES[bankId.toLowerCase()];
    
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setImgAttempt(0);
    }, [bankId]);

    const renderFallbackSVG = (): ReactNode => {
        const id = bankId.toLowerCase();
        
        // --- BANESCO (Verde con arcos blancos dinámicos) ---
        if (id.includes("banesco")) {
            return (
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="20" fill="#009639" />
                    <path d="M22 45C22 45 35 32 50 32C65 32 78 45 78 45" stroke="white" strokeWidth="10" strokeLinecap="round" />
                    <path d="M22 68C22 68 35 55 50 55C65 55 78 68 78 68" stroke="white" strokeWidth="10" strokeLinecap="round" />
                </svg>
            );
        }
        
        // --- MERCANTIL (Azul con M y arco amarillo) ---
        if (id.includes("mercantil")) {
            return (
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#1E40AF" />
                    <path d="M25 70V30L50 50L75 30V70" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M72 25C72 25 80 32 80 42" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
                </svg>
            );
        }
        
        // --- BANCO DE VENEZUELA (Rojo BDV con isotipo circular moderno) ---
        if (id.includes("venezuela") || id.includes("bdv")) {
            return (
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="48" fill="#E11D48" />
                    <path d="M30 35H70L50 75L30 35Z" fill="white" />
                    <path d="M50 75L70 35H60L50 55L40 35H30L50 75Z" fill="#E11D48" />
                </svg>
            );
        }
        
        // --- PROVINCIAL / BBVA ---
        if (id.includes("provincial") || id.includes("bbva")) {
            return (
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="16" fill="#004481" />
                    <text x="50" y="62" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" letterSpacing="-1" fontFamily="Arial Black, sans-serif">BBVA</text>
                </svg>
            );
        }
        
        if (id.includes("efectivo") || id.includes("movil")) {
            return (
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="30" width="80" height="40" rx="8" stroke="#FBBF24" strokeWidth="6" />
                    <circle cx="50" cy="50" r="10" stroke="#FBBF24" strokeWidth="6" />
                    <path d="M25 40V60M75 40V60" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" />
                </svg>
            );
        }

        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="35" stroke="#FBBF24" strokeWidth="8" />
                <path d="M50 25L58 50L50 75L42 50L50 25Z" fill="#EF4444" />
                <circle cx="50" cy="50" r="6" fill="#1E40AF" stroke="white" strokeWidth="2" />
            </svg>
        );
    };

    // Robust Fallback Logic
    let currentUrl: string | null = null;
    if (imgAttempt === 0) {
        currentUrl = realLogoUrl;
    } else if (imgAttempt === 1 && domain) {
        // Intento 2: Google Favicon Service (WWW suele ser más exitoso)
        currentUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=${size * 2}`;
    } else if (imgAttempt === 2 && domain) {
        // Intento 3: Clearbit (como último recurso)
        currentUrl = `https://logo.clearbit.com/${domain}?size=${size * 2}`;
    }

    useEffect(() => {
        if (imgAttempt === 0 && !realLogoUrl && domain) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setImgAttempt(1); 
        } else if (imgAttempt === 0 && !realLogoUrl && !domain) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setImgAttempt(3);
        }
    }, [imgAttempt, realLogoUrl, domain]);

    return (
        <div 
            className={cn("flex items-center justify-center shrink-0 overflow-hidden bg-white/5 rounded-xl border border-white/5", className)}
            style={{ width: size, height: size }}
        >
            {currentUrl && imgAttempt < 3 ? (
                <img 
                    src={currentUrl} 
                    alt={bankId}
                    className="w-full h-full object-contain p-1"
                    onError={() => setImgAttempt(prev => prev + 1)}
                />
            ) : (
                <div className="w-full h-full p-1.5 flex items-center justify-center">
                    {renderFallbackSVG()}
                </div>
            )}
        </div>
    );

}
