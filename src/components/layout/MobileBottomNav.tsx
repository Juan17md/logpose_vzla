"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiList, FiPieChart, FiShoppingCart, FiMenu, FiGrid } from "react-icons/fi";
import Logo from "./Logo";

interface MobileBottomNavProps {
    onMenuClick: () => void;
    onNavigate: () => void;
}

export default function MobileBottomNav({ onMenuClick, onNavigate }: MobileBottomNavProps) {
    const pathname = usePathname();

    const leftItems = [
        { name: "Inicio", icon: <FiHome className="w-[22px] h-[22px]" />, href: "/dashboard" },
        { name: "Movs", icon: <FiList className="w-[22px] h-[22px]" />, href: "/dashboard/movimientos" },
    ];

    const rightItems = [
        { name: "Reportes", icon: <FiPieChart className="w-[22px] h-[22px]" />, href: "/dashboard/reportes" },
        { name: "Listas", icon: <FiShoppingCart className="w-[22px] h-[22px]" />, href: "/dashboard/listas" },
    ];

    const NavItem = ({ item }: { item: any }) => {
        const isActive = pathname === item.href;
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="flex flex-col items-center justify-center w-16 gap-1 group"
            >
                <div className={`transition-all duration-300 ${isActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                    {item.icon}
                </div>
                <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                    {item.name}
                </span>
            </Link>
        );
    };

    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] rounded-full px-2 py-3 z-50 flex justify-between items-center transition-all duration-300 pb-safe">
            <div className="flex justify-evenly flex-1">
                {leftItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                ))}
            </div>

            {/* Central Action Button */}
            <button
                onClick={onMenuClick}
                className="group relative flex items-center justify-center -translate-y-3 mx-2 select-none"
                aria-label="Menú Principal"
            >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-amber-500/30 dark:bg-amber-400/20 blur-xl rounded-full scale-110 transition-transform duration-300 group-hover:scale-125" />

                {/* Button container */}
                <div className="relative w-14 h-14 bg-gradient-to-tr from-amber-500 to-yellow-400 dark:from-amber-500 dark:to-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 border-2 border-white dark:border-[#0f172a] transition-all duration-300 group-hover:-translate-y-1 active:scale-95 p-2">
                    <Logo variant="icon" width={36} height={36} className="text-slate-900" />
                </div>
            </button>

            <div className="flex justify-evenly flex-1">
                {rightItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                ))}
            </div>
        </div>
    );
}
