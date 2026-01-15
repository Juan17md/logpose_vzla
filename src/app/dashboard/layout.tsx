"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import { FiMenu } from "react-icons/fi";

import { EditTransactionProvider } from "@/contexts/EditTransactionContext";
import { TransactionsProvider } from "@/contexts/TransactionsContext";
import { UserDataProvider } from "@/contexts/UserDataContext";

import MobileBottomNav from "@/components/layout/MobileBottomNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <EditTransactionProvider>
            <TransactionsProvider>
                <UserDataProvider>
                    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30">
                        {/* Sidebar Component */}
                        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                        {/* Main Content Area */}
                        <div className="md:pl-72 flex flex-col min-h-screen transition-all duration-300">

                            {/* Mobile Header / Top Bar */}
                            <header className="md:hidden sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 p-4 flex items-center justify-center shadow-lg">
                                <Link href="/dashboard">
                                    <h1 className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                        Control Gastos
                                    </h1>
                                </Link>
                            </header>

                            {/* Page Content */}
                            <main className="flex-1 p-4 md:p-8 overflow-x-hidden mb-20 md:mb-0">
                                <div className="max-w-7xl mx-auto animation-fade-in relative z-0">
                                    {children}
                                </div>
                            </main>

                            {/* Mobile Bottom Navigation */}
                            <MobileBottomNav
                                onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
                                onNavigate={() => setIsSidebarOpen(false)}
                            />
                        </div>
                    </div>
                </UserDataProvider>
            </TransactionsProvider>
        </EditTransactionProvider>
    );
}
