"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiList, FiPieChart, FiUser, FiLogOut, FiX, FiShoppingCart, FiBriefcase, FiCalendar, FiCreditCard } from "react-icons/fi";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import Logo from "./Logo";
import { Outfit } from "next/font/google";

const outfit = Outfit({ variable: "--font-outfit", weight: ["400","500","600","700","800"], subsets: ["latin"] });

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const menuItems = [
        { name: "Pantalla Principal", icon: <FiHome />, href: "/dashboard" },
        { name: "Movimientos", icon: <FiList />, href: "/dashboard/movimientos" },
        { name: "Cuentas", icon: <FiCreditCard />, href: "/dashboard/cuentas" },
        { name: "Listas", icon: <FiShoppingCart />, href: "/dashboard/listas" },
        { name: "Gastos Fijos", icon: <FiCalendar />, href: "/dashboard/gastos-fijos" },
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
            {/* Estilos del gradiente animado - mismo del login */}
            <style>{`
                @keyframes gtext {
                    0%,100% { background-position:0% 50%; }
                    50%     { background-position:100% 50%; }
                }
                .sidebar-grad-text {
                    background: linear-gradient(135deg,#FBBF24,#F59E0B,#CA8A04,#FBBF24);
                    background-size:300% 300%;
                    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
                    background-clip:text;
                    animation: gtext 5s ease infinite;
                }
            `}</style>

            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`fixed z-50 transition-transform duration-300 ease-in-out
                /* Mobile: Full Screen Bottom Sheet */
                bottom-0 left-0 w-full h-dvh rounded-t-[2.5rem] border-t border-slate-700/50 
                bg-slate-900/95 backdrop-blur-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]
                ${isOpen ? "translate-y-0" : "translate-y-full"}
                
                /* Desktop: Left Sidebar */
                md:top-0 md:bottom-auto md:h-screen md:w-72 md:rounded-none md:border-t-0 md:border-r md:border-slate-700/30 md:bg-slate-900/40 
                md:translate-y-0 md:translate-x-0 md:shadow-2xl
                `}
            >
                <div className="flex flex-col h-full relative">
                    {/* Mobile Handle */}
                    <div className="md:hidden w-full flex justify-center pt-4 pb-1 shrink-0" onClick={onClose}>
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
                    </div>

                    {/* Header - Mismo diseño del Login */}
                    <div className={`${outfit.variable} px-4 pt-4 pb-2 md:p-6 flex items-start md:items-center justify-between relative z-10 shrink-0`}>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/15 blur-[20px] rounded-full scale-125 pointer-events-none"></div>
                                <div className="relative p-2 bg-slate-800/80 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(202,138,4,0.15)] shrink-0">
                                    <Logo variant="icon" width={36} height={36} />
                                </div>
                            </div>
                            <div className="flex flex-col justify-center">
                                <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white leading-none" style={{fontFamily:"var(--font-outfit)"}}>
                                    LogPose <span className="sidebar-grad-text">Vzla</span>
                                </h2>
                                <p className="text-[10px] text-violet-400 font-bold tracking-widest uppercase mt-1">
                                    Premium Dashboard
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-700/50">
                            <FiX className="text-xl" />
                        </button>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 relative z-10">
                        {/* Navigation */}
                        <nav className="space-y-1 py-4">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 ml-1 opacity-70">Menú Principal</div>
                            {menuItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                                            ? "text-amber-400 font-semibold shadow-lg shadow-amber-500/10 bg-slate-800/80 border border-slate-700/50"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                                            }`}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-amber-500 rounded-r-lg shadow-[0_0_10px_2px_rgba(245,158,11,0.5)]"></div>
                                        )}
                                        <span className={`text-xl relative z-10 transition-transform duration-300 ${isActive ? "text-amber-400 scale-110" : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"}`}>
                                            {item.icon}
                                        </span>
                                        <span className="relative z-10 text-sm tracking-wide">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Footer / Logout - Fixed at bottom */}
                    <div className="p-4 mt-auto relative z-10 bg-slate-900/80 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none border-t border-slate-800/50 md:border-t-0 pb-12 md:pb-8">
                        {/* User Info */}
                        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                            <div className="relative shrink-0">
                                {user?.photoURL ? (
                                    <div className="w-9 h-9 rounded-full border border-amber-500/30 overflow-hidden shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                        <img 
                                            src={user.photoURL} 
                                            alt={user.displayName || "Usuario"} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-2 bg-amber-500/20 rounded-full border border-amber-500/30">
                                        <FiUser className="text-amber-400 text-lg" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Usuario Conectado</p>
                                <p className="text-sm font-bold text-white truncate">{user?.displayName || "Usuario"}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-3 px-6 py-4 md:py-3 rounded-2xl 
                            text-red-400 bg-red-500/10 hover:bg-red-500/20 
                            transition-all duration-300 group 
                            border border-red-500/30 hover:border-red-500/50
                            shadow-lg shadow-red-500/10 hover:shadow-red-500/20
                            active:scale-95"
                        >
                            <FiLogOut className="text-xl md:text-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                            <span className="font-bold text-base md:text-sm">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
