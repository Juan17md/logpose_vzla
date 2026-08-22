"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "@/components/layout/Sidebar";

import Footer from "@/components/layout/Footer";
import Logo from "@/components/layout/Logo";

import { EditTransactionProvider } from "@/contexts/EditTransactionContext";
import { TransactionsProvider } from "@/contexts/TransactionsContext";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { BankAccountsProvider } from "@/contexts/BankAccountsContext";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import MigracionCuentas from "@/components/cuentas/MigracionCuentas";
import AvisoCuentasFaltantes from "@/components/cuentas/AvisoCuentasFaltantes";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import dynamic from "next/dynamic";

// Chatbot cargado de forma diferida — 59KB que solo se necesitan cuando el usuario lo abre
// El layout es visible y funcional sin esperar a que este bundle descargue
const Chatbot = dynamic(() => import("@/components/ui/Chatbot"), {
  ssr: false,
  loading: () => null, // El FAB del chatbot no necesita placeholder visible
});

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    let montado = true;

    // Timeout de seguridad: si Firebase Auth tarda más de 5s, redirigir a login o desbloquear
    const timer = setTimeout(() => {
      if (montado && !verificado) {
        if (!auth.currentUser) {
          router.replace("/login");
        } else {
          setVerificado(true);
        }
      }
    }, 5000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!montado) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const oc = data.onboardingCompleted;
          if (oc === undefined) {
            await updateDoc(doc(db, "users", user.uid), { onboardingCompleted: true });
          } else if (oc === false) {
            router.replace("/onboarding");
            return;
          }
        }
      } catch {
        // Si falla la lectura, dejar pasar al dashboard
      }
      if (montado) {
        setVerificado(true);
      }
    });

    return () => {
      montado = false;
      clearTimeout(timer);
      unsub();
    };
  }, [router, verificado]);

  if (!verificado) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }
  return <>{children}</>;
}

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
                    <BankAccountsProvider>
                        <CategoriesProvider>
                            <OnboardingGuard>
                            <MigracionCuentas />
                            <AvisoCuentasFaltantes />
                          <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30 flex flex-col">
                            {/* Main Content Area */}
                            <div className="flex-1 flex">
                              {/* Sidebar Component */}
                              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                
                              {/* Page Content */}
                              <div className="md:pl-72 flex flex-col w-full">
                                {/* Mobile Header / Top Bar */}
                                <header className="md:hidden sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 p-4 pt-safe flex items-center justify-center shadow-lg">
                                  <Link href="/dashboard" className="flex items-center gap-2">
                                    <Logo variant="icon" width={32} height={32} />
                                    <h1 className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                      LogPose <span className="text-amber-400">Vzla</span>
                                    </h1>
                                  </Link>
                                </header>
                
                                <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
                                  <div className="max-w-7xl mx-auto">
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
                          </OnboardingGuard>
                        </CategoriesProvider>
                    </BankAccountsProvider>
                </UserDataProvider>
            </TransactionsProvider>
        </EditTransactionProvider>
    );
}