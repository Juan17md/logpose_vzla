"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { FiUser, FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff, FiPieChart, FiTrendingUp } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/forms/Input";
import Logo from "@/components/layout/Logo";

import { IBM_Plex_Sans } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({ 
  variable: "--font-ibm-plex-sans", 
  weight: ["300", "400", "500", "600", "700"], 
  subsets: ["latin"] 
});

const styles = `
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .form-card {
    animation: fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .input-group input:focus {
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15), 0 0 20px rgba(251, 191, 36, 0.1);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
  }
  .btn-primary:active {
    transform: translateY(0) scale(0.98);
  }
  .group-logo:hover .logo-glow {
    opacity: 1;
  }
`;

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(z.object({
            name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
            email: z.string().email("Correo electrónico inválido"),
            password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        })),
    });

    const onSubmit = async (data: { name: string; email: string; password: string }) => {
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: data.name,
            });

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: data.name,
                email: data.email,
                plan: "free",
                createdAt: serverTimestamp(),
            });

            toast.success("¡Cuenta creada!", {
                description: "Bienvenido a tu control de gastos.",
            });

            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            let errorMessage = "Ocurrió un error al registrarse.";
            if (error instanceof FirebaseError) {
                if (error.code === "auth/email-already-in-use") {
                    errorMessage = "Este correo ya está registrado.";
                } else if (error.code === "auth/weak-password") {
                    errorMessage = "La contraseña debe tener al menos 6 caracteres.";
                }
            }

            toast.error("Error", {
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{styles}</style>
            <div className={`min-h-screen flex w-full font-(--font-ibm-plex-sans) ${ibmPlexSans.variable} bg-[#0F172A] overflow-hidden relative`}>
                {/* Animated Background Mesh */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1E293B] via-[#0F172A] to-[#020617]"></div>
                    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#8B5CF6]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
                    <div className="absolute top-1/3 right-[-150px] w-[700px] h-[700px] bg-[#F59E0B]/10 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }}></div>
                    <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] bg-[#FBBF24]/15 rounded-full blur-[100px]"></div>
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}></div>
                </div>

                {/* LEFT COLUMN: Visual/Branding (Desktop Only) */}
                <div className="hidden lg:flex w-1/2 relative items-center justify-center z-10">
                    <div className="flex flex-col items-center justify-center p-12 text-center max-w-lg">
                        <div className="relative mb-8 group-logo">
                            <div className="absolute inset-0 bg-[#FBBF24]/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <Logo variant="map" width={280} height={280} className="drop-shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:scale-105 transition-all duration-700 ease-out" />
                        </div>
                        <h2 className="text-5xl font-bold tracking-tight text-white mb-6 relative">
                            LogPose <span className="text-[#FBBF24] relative">
                                Vzla
                                <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] rounded-full"></span>
                            </span>
                        </h2>
                        <p className="text-slate-300 text-lg mx-auto leading-relaxed max-w-md">
                            Toma el timón de tu futuro financiero. Un viaje seguro y organizado comienza aquí.
                        </p>
                        
                        {/* Feature Cards with stagger animation */}
                        <div className="mt-16 grid grid-cols-1 gap-5 w-full">
                            <div className="group-card-1 opacity-0 translate-y-4 animate-fade-in-up">
                                <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:bg-white/10 hover:border-white/20 transition-all duration-500 flex gap-4 items-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/0 via-[#F59E0B]/5 to-[#F59E0B]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] shadow-lg shadow-[#F59E0B]/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                        <FiPieChart className="text-white text-xl" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold tracking-wide group-hover:text-[#FBBF24] transition-colors">Planificación Clara</p>
                                        <p className="text-slate-400 text-sm">Establece tus objetivos mensuales</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group-card-2 opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                                <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:bg-white/10 hover:border-white/20 transition-all duration-500 flex gap-4 items-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/0 via-[#8B5CF6]/5 to-[#8B5CF6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-lg shadow-[#8B5CF6]/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                        <FiTrendingUp className="text-white text-xl" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold tracking-wide group-hover:text-[#A78BFA] transition-colors">Crecimiento Constante</p>
                                        <p className="text-slate-400 text-sm">Monitorea tus ahorros día a día</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Form (Full width on Mobile) */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo Header */}
                        <div className="lg:hidden flex flex-col items-center justify-center mb-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#FBBF24]/20 blur-[30px] rounded-full"></div>
                                <Logo variant="dark" width={200} height={90} className="relative" />
                            </div>
                            <p className="mt-4 text-slate-300/80 text-sm font-medium tracking-wide text-center">
                                Navegando el Grand Line de tus finanzas
                            </p>
                        </div>
                        
                        {/* Glassmorphism Auth Card with entrance animation */}
                        <div className="bg-[#1E293B]/30 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] relative overflow-hidden form-card opacity-0 translate-y-4 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none"></div>
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#FBBF24]/10 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="text-center lg:text-left mb-8 relative z-10">
                                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                                    Crear Cuenta<span className="text-[#FBBF24]">.</span>
                                </h1>
                                <p className="text-slate-400">Comienza a tomar el control de tu dinero</p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
                                <div className="input-group opacity-0 translate-y-2 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                                    <Input
                                        label="Nombre Completo"
                                        type="text"
                                        placeholder="Juan Pérez"
                                        icon={<FiUser />}
                                        {...register("name")}
                                        error={errors.name}
                                    />
                                </div>

                                <div className="input-group opacity-0 translate-y-2 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                                    <Input
                                        label="Correo Electrónico"
                                        type="email"
                                        placeholder="ejemplo@correo.com"
                                        icon={<FiMail />}
                                        {...register("email")}
                                        error={errors.email}
                                    />
                                </div>

                                <div className="input-group opacity-0 translate-y-2 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
                                    <Input
                                        label="Contraseña"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        icon={<FiLock />}
                                        {...register("password")}
                                        error={errors.password}
                                        rightElement={
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-slate-400 hover:text-[#FBBF24] transition-colors focus:outline-none cursor-pointer p-1"
                                            >
                                                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                            </button>
                                        }
                                    />
                                </div>

                                <div className="opacity-0 translate-y-2 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full group btn-primary relative overflow-hidden bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] bg-[length:200%_100%] text-[#0F172A] font-bold py-3.5 px-6 rounded-2xl shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_30px_rgba(245,158,11,0.6)] hover:bg-[length:100%_100%] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {loading ? (
                                                <span className="w-5 h-5 border-2 border-[#0F172A]/30 border-t-[#0F172A] rounded-full animate-spin"></span>
                                            ) : (
                                                <>
                                                    <span>Registrarse</span>
                                                    <FiArrowRight className="text-lg transition-transform duration-300 group-hover:translate-x-1" />
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </form>

                            <p className="mt-8 text-center text-sm text-slate-400 relative z-10 opacity-0 animate-fade-in-up" style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
                                ¿Ya tienes una cuenta?{" "}
                                <Link href="/login" className="text-[#FBBF24] hover:text-[#FCD34D] font-semibold hover:underline transition-all duration-200 ml-1 relative inline-block">
                                    Inicia sesión
                                    <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-[#FBBF24] group-hover:w-full transition-all duration-300"></span>
                                </Link>
                            </p>
                        </div>
                        
                        {/* Footer */}
                        <p className="text-center text-xs text-slate-600 mt-6 hidden lg:block opacity-0 animate-fade-in-up" style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}>
                            © {new Date().getFullYear()} LogPose Vzla Project. Designed by: Juan17md
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}