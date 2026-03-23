"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";

import Footer from "@/components/layout/Footer";
import Logo from "@/components/layout/Logo";

import { EditTransactionProvider } from "@/contexts/EditTransactionContext";
import { TransactionsProvider } from "@/contexts/TransactionsContext";
import { UserDataProvider } from "@/contexts/UserDataContext";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import Chatbot from "@/components/ui/Chatbot";

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
          <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30 flex flex-col">

            
            {/* Main Content Area */}
            <div className="flex-1 flex">
              {/* Sidebar Component */}
              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

              {/* Page Content */}
              <div className="md:pl-72 flex flex-col w-full">
                {/* Mobile Header / Top Bar */}
                <header className="md:hidden sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 p-4 flex items-center justify-center shadow-lg">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Logo variant="icon" width={32} height={32} />
                    <h1 className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                      LogPose <span className="text-amber-400">Vzla</span>
                    </h1>
                  </Link>
                </header>

                <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
                  <div className="max-w-7xl mx-auto animation-fade-in relative z-0">
                    {children}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <Footer />
            
            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
              onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
              onNavigate={() => setIsSidebarOpen(false)}
            />
            
            <Chatbot />
          </div>
        </UserDataProvider>
      </TransactionsProvider>
    </EditTransactionProvider>
  );
}