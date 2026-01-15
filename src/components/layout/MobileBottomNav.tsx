"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiList, FiPieChart, FiShoppingCart, FiMenu } from "react-icons/fi";

interface MobileBottomNavProps {
    onMenuClick: () => void;
    onNavigate: () => void;
}

export default function MobileBottomNav({ onMenuClick, onNavigate }: MobileBottomNavProps) {
    const pathname = usePathname();

    const navItems = [
        { name: "Inicio", icon: <FiHome />, href: "/dashboard" },
        { name: "Movimientos", icon: <FiList />, href: "/dashboard/movimientos" },
        { name: "Listas", icon: <FiShoppingCart />, href: "/dashboard/listas" },
        { name: "Reportes", icon: <FiPieChart />, href: "/dashboard/reportes" },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 pb-safe pt-2 px-6 z-50 flex justify-between items-center h-[80px]">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? "text-emerald-400 -translate-y-1" : "text-slate-500 hover:text-slate-300"
                            }`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-emerald-500/20" : "bg-transparent"}`}>
                            <span className="text-2xl">{item.icon}</span>
                        </div>
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                );
            })}

            <button
                onClick={onMenuClick}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-all duration-300"
            >
                <div className="p-2 rounded-xl bg-transparent">
                    <span className="text-2xl"><FiMenu /></span>
                </div>
                <span className="text-[10px] font-medium">Menú</span>
            </button>
        </div>
    );
}
