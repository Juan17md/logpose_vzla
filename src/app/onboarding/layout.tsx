"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { BankAccountsProvider } from "@/contexts/BankAccountsContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { Outfit, IBM_Plex_Sans } from "next/font/google";
import Logo from "@/components/layout/Logo";

const outfit = Outfit({ variable: "--font-outfit", weight: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm", weight: ["300", "400", "500", "600", "700"], subsets: ["latin"] });

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().onboardingCompleted === true) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Si falla la lectura, dejar pasar al onboarding
      }

      setVerificando(false);
    });

    return () => unsub();
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080F]">
        <div className="flex flex-col items-center gap-4">
          <Logo variant="icon" width={48} height={48} />
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#06080F] ${ibmPlexSans.variable} ${outfit.variable}`} style={{ fontFamily: "var(--font-ibm)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-amber-500/20 blur-[100px]" />
        <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-violet-600/18 blur-[120px]" />
        <div className="orb3 absolute top-[30%] left-[35%] w-[500px] h-[500px] rounded-full bg-violet-500/12 blur-[90px]" />
        <div className="orb4 absolute top-[60%] left-[5%] w-[400px] h-[400px] rounded-full bg-amber-400/10 blur-[80px]" />
        <div className="grid-anim absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "80px 80px" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_15%_50%,rgba(202,138,4,.12)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_85%_50%,rgba(124,58,237,.10)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-center p-6">
          <div className="flex items-center gap-3">
            <Logo variant="icon" width={36} height={36} />
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
              LogPose <span className="text-amber-400">Vzla</span>
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-start justify-center px-4 pb-12">
          <div className="w-full max-w-2xl">
            <div className="bg-[#0B0F1A]/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-lg border border-slate-700/30 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
              <BankAccountsProvider>
                <UserDataProvider>
                  <OnboardingProvider>
                    {children}
                  </OnboardingProvider>
                </UserDataProvider>
              </BankAccountsProvider>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .orb1 { opacity: 0.9; }
        .orb2 { opacity: 0.9; }
        .orb3 { opacity: 0.9; }
        .orb4 { opacity: 0.9; }
        .grid-anim { opacity: 0.05; }
      `}</style>
    </div>
  );
}
