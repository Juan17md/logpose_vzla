"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiList, FiPieChart, FiUser, FiLogOut, FiX, FiShoppingCart, FiBriefcase, FiCalendar, FiCreditCard } from "react-icons/fi";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const menuItems = [
        { name: "Dashboard", icon: <FiHome />, href: "/dashboard" },
        { name: "Movimientos", icon: <FiList />, href: "/dashboard/movimientos" },
        { name: "Listas", icon: <FiShoppingCart />, href: "/dashboard/listas" },
        { name: "Gastos Fijos", icon: <FiCalendar />, href: "/dashboard/gastos-fijos" },
        { name: "Ahorros", icon: <FiBriefcase />, href: "/dashboard/ahorros" },
        { name: "Deudas", icon: <FiCreditCard />, href: "/dashboard/deudas" },
        { name: "Reportes", icon: <FiPieChart />, href: "/dashboard/reportes" },
        { name: "Perfil", icon: <FiUser />, href: "/dashboard/perfil" },
    ];

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push("/login");
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`fixed z-50 transition-transform duration-300 ease-in-out
                /* Mobile: Bottom Sheet */
                bottom-0 left-0 w-full max-h-[85vh] rounded-t-[2.5rem] border-t border-slate-700/50 
                bg-slate-900/95 backdrop-blur-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]
                ${isOpen ? "translate-y-0" : "translate-y-full"}
                
                /* Desktop: Left Sidebar */
                md:top-0 md:bottom-auto md:h-screen md:max-h-none md:w-72 md:rounded-none md:border-t-0 md:border-r md:border-slate-700/30 md:bg-slate-900/40 
                md:translate-y-0 md:translate-x-0 md:shadow-2xl
                `}
            >
                <div className="flex flex-col h-full relative overflow-hidden">
                    {/* Mobile Handle */}
                    <div className="md:hidden w-full flex justify-center pt-4 pb-1" onClick={onClose}>
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
                    </div>
                    {/* Decorative glow */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-emerald-500/10 blur-3xl -translate-y-16 pointer-events-none"></div>

                    {/* Header */}
                    <div className="px-8 pb-4 pt-2 md:p-8 flex items-center justify-between relative z-10">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                Control Gastos
                            </h2>
                            <p className="text-xs text-slate-500 font-medium tracking-wider uppercase mt-1">
                                Finanzas Personales
                            </p>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white transition-colors">
                            <FiX className="text-xl" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-4 ml-1">Menu Principal</div>
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${isActive
                                        ? "text-emerald-400 font-medium shadow-lg shadow-emerald-500/10 bg-slate-800/50"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-emerald-500 rounded-lg shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]"></div>
                                    )}
                                    <span className={`text-xl relative z-10 transition-transform duration-300 ${isActive ? "text-emerald-400 scale-110" : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"}`}>
                                        {item.icon}
                                    </span>
                                    <span className="relative z-10">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer / Logout */}
                    <div className="p-4 border-t border-slate-700/30 relative z-10">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group border border-transparent hover:border-red-500/20"
                        >
                            <FiLogOut className="text-lg group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
