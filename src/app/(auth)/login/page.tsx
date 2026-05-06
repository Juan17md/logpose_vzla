"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInWithRedirect, getRedirectResult, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff, FiPieChart, FiTrendingUp, FiShield } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/forms/Input";
import Logo from "@/components/layout/Logo";
import { motion } from "framer-motion";
import { Outfit, IBM_Plex_Sans } from "next/font/google";

const outfit = Outfit({ variable: "--font-outfit", weight: ["400","500","600","700","800"], subsets: ["latin"] });
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm", weight: ["300","400","500","600","700"], subsets: ["latin"] });

const estilos = `
  @keyframes aurora-move {
    0%   { transform: translate(0px, 0px)   scale(1);    }
    33%  { transform: translate(40px,-30px) scale(1.08); }
    66%  { transform: translate(-30px,20px) scale(0.94); }
    100% { transform: translate(0px, 0px)   scale(1);    }
  }
  @keyframes aurora-move2 {
    0%   { transform: translate(0px,0px)    scale(1);    }
    33%  { transform: translate(-50px,30px) scale(1.12); }
    66%  { transform: translate(30px,-40px) scale(0.92); }
    100% { transform: translate(0px,0px)    scale(1);    }
  }
  @keyframes aurora-move3 {
    0%   { transform: translate(0px,0px)   scale(1);    }
    50%  { transform: translate(20px,50px) scale(1.06); }
    100% { transform: translate(0px,0px)   scale(1);    }
  }
  @keyframes float-particle {
    0%,100% { transform:translateY(0px)  opacity:0.5; }
    50%      { transform:translateY(-24px) opacity:1;   }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { transform: translateX(-150%); }
    100% { transform: translateX(150%);  }
  }
  @keyframes border-pulse {
    0%,100% { opacity:.5; }
    50%      { opacity:1;  }
  }
  @keyframes gtext {
    0%,100% { background-position:0% 50%;   }
    50%      { background-position:100% 50%; }
  }
  @keyframes grid-fade {
    0%,100% { opacity:.04; }
    50%      { opacity:.07; }
  }

  .orb1 { animation: aurora-move  22s ease-in-out infinite; }
  .orb2 { animation: aurora-move2 28s ease-in-out infinite; }
  .orb3 { animation: aurora-move3 18s ease-in-out infinite; }
  .orb4 { animation: aurora-move  35s ease-in-out infinite reverse; }

  .grid-anim { animation: grid-fade 8s ease-in-out infinite; }

  .shimmer-btn { overflow:hidden; }
  .shimmer-btn::after {
    content:''; position:absolute; inset:0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.28) 50%, transparent 100%);
    animation: shimmer 2.8s ease-in-out infinite;
  }

  .card-glow {
    position:relative;
  }
  .card-glow::before {
    content:'';
    position:absolute; inset:-1px; border-radius:1.75rem; z-index:0;
    background: conic-gradient(from var(--angle,0deg), #CA8A04 0%, #7C3AED 25%, #0EA5E9 50%, #7C3AED 75%, #CA8A04 100%);
    animation: border-pulse 3s ease-in-out infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude; -webkit-mask-composite: xor;
    padding:1px; pointer-events:none;
  }

  .grad-text {
    background: linear-gradient(135deg,#FBBF24,#F59E0B,#CA8A04,#FBBF24);
    background-size:300% 300%;
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text;
    animation: gtext 5s ease infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .orb1,.orb2,.orb3,.orb4 { animation:none; }
    .shimmer-btn::after { animation:none; }
    .card-glow::before  { animation:none; opacity:.7; }
    .grad-text          { animation:none; }
    .grid-anim          { animation:none; }
  }
`;

const stagger = { oculto:{opacity:0}, visible:{opacity:1, transition:{staggerChildren:.09, delayChildren:.15}} };
const item    = {
  oculto:  { opacity:0, y:20, filter:"blur(6px)" },
  visible: { opacity:1, y:0,  filter:"blur(0px)", transition:{ duration:.55, ease:[0.22,1,0.36,1] as [number,number,number,number] } }
};
const card = {
  oculto:  { opacity:0, y:30, scale:.96 },
  visible: { opacity:1, y:0,  scale:1,   transition:{ duration:.65, ease:[0.22,1,0.36,1] as [number,number,number,number] } }
};

import { isBiometricSupported, authenticateBiometric } from "@/lib/biometrics";

const FaceIdIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        <path d="M8 7v2m8-2v2" />
        <path d="M9 14s1 1 3 1 3-1 3-1" />
        <path d="M12 11v2" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading]           = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);

    const { register, handleSubmit, formState:{errors} } = useForm({
        resolver: zodResolver(z.object({
            email:    z.string().email("Correo electrónico inválido"),
            password: z.string().min(1, "La contraseña es obligatoria"),
        })),
    });

    useEffect(() => {
        const checkBiometric = async () => {
            const supported = await isBiometricSupported();
            setBiometricSupported(supported);
        };
        checkBiometric();
    }, []);

    const onSubmit = async (data:{email:string;password:string}) => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            toast.success("¡Bienvenido de nuevo!", { description:"Has iniciado sesión correctamente." });
            router.push("/dashboard");
        } catch (error) {
            let msg = "Ocurrió un error al iniciar sesión.";
            if (error instanceof FirebaseError) {
                if (["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(error.code)) msg="Credenciales incorrectas.";
                else if (error.code==="auth/invalid-email") msg="El correo electrónico no es válido.";
                else if (error.code==="auth/too-many-requests") msg="Demasiados intentos fallidos. Intenta más tarde.";
            }
            toast.error("Error", { description:msg });
        } finally { setLoading(false); }
    };

    const handleFaceID = async () => {
        setLoading(true);
        try {
            const assertion = await authenticateBiometric();
            if (assertion) {
                toast.success("¡Identidad Verificada!", { description: "Face ID autenticado correctamente." });
                
                // Nota: En una implementación completa, aquí usaríamos el ID de la credencial
                // para buscar al usuario en Firestore y realizar un signInWithCustomToken.
                // Por ahora, simulamos el éxito o guiamos al usuario.
                
                const lastUser = localStorage.getItem("last_user_email");
                if (lastUser) {
                    toast.info("Iniciando sesión...", { description: `Conectando como ${lastUser}` });
                    // Aquí se dispararía la lógica de sesión persistente biométrica
                    router.push("/dashboard");
                } else {
                    toast.error("Vínculo no encontrado", { 
                        description: "Primero inicia sesión con tu correo y activa Face ID en tu perfil." 
                    });
                }
            }
        } catch (error) {
            console.error("Error Face ID:", error);
            toast.error("Error de Biometría", { description: "No se pudo completar la verificación." });
        } finally {
            setLoading(false);
        }
    };

    // Lógica centralizada para procesar el usuario después del login (Popup o Redirect)
    const procesarLoginUsuario = useCallback(async (usuario: User) => {
        try {
            const docRef = doc(db, "users", usuario.uid);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                await setDoc(docRef, {
                    uid: usuario.uid,
                    displayName: usuario.displayName || "Usuario",
                    email: usuario.email,
                    plan: "free",
                    createdAt: serverTimestamp(),
                });
            }

            const tienePassword = usuario.providerData.some(p => p.providerId === "password");

            if (!tienePassword) {
                toast.info("¡Un paso más!", { 
                    description: "Crea una contraseña para acceder también con tu correo.",
                    duration: 5000
                });
                router.push("/crear-contrasena");
            } else {
                toast.success("¡Bienvenido!", { description: "Sesión iniciada correctamente." });
                router.push("/dashboard");
            }
        } catch (error) {
            console.error("Error al procesar login:", error);
            toast.error("Error", { description: "Error al sincronizar tu perfil." });
        }
    }, [router]);

    // Ref para asegurar que checkRedirect solo se ejecute una vez (evita problemas en Strict Mode)
    const checkRedirectEjecutado = useRef(false);

    // Manejar el resultado del redirect al cargar la página
    useEffect(() => {
        if (typeof window === "undefined" || checkRedirectEjecutado.current) return;

        const checkRedirect = async () => {
            if (!auth) return; // Chequeo defensivo
            
            checkRedirectEjecutado.current = true;
            try {
                const resultado = await getRedirectResult(auth);
                if (resultado?.user) {
                    setLoading(true);
                    await procesarLoginUsuario(resultado.user);
                }
            } catch (error) {
                console.error("Error en Google Redirect:", error);
                if (error instanceof FirebaseError) {
                    // Solo mostrar error si no es un error de operación cancelada o similar
                    if (error.code !== "auth/redirect-cancelled-by-user") {
                        toast.error("Error de Autenticación", { 
                            description: `Código: ${error.code}. Intenta con el formulario.` 
                        });
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        
        checkRedirect();
    }, [procesarLoginUsuario]);

    const handleGoogle = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isStandalone || isMobile) {
                await signInWithRedirect(auth, provider);
            } else {
                const resultado = await signInWithPopup(auth, provider);
                await procesarLoginUsuario(resultado.user);
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            console.error("Error completo de Google Auth:", error);
            let msg = "Ocurrió un error al iniciar sesión con Google.";
            if (error instanceof FirebaseError) {
                if (error.code === "auth/popup-closed-by-user") msg = "Inicio de sesión cancelado.";
                else if (error.code === "auth/account-exists-with-different-credential") msg = "Ya existe una cuenta con este correo vinculada a otro método.";
                else if (error.code === "auth/popup-blocked") msg = "El navegador bloqueó la ventana emergente. Intenta de nuevo.";
                else msg = `Error de Firebase: ${error.code}`;
            }
            toast.error("Error", { description: msg });
        }
    };

    const features = [
        { icon:<FiPieChart/>,    title:"Análisis Premium",  desc:"Visualiza tu progreso financiero",    from:"from-amber-500",  to:"to-amber-700",   glow:"shadow-amber-500/40",  accent:"group-hover/f:text-amber-400"  },
        { icon:<FiTrendingUp/>,  title:"Control Total",     desc:"Ahorros y deudas en un solo lugar",   from:"from-violet-500", to:"to-violet-700",  glow:"shadow-violet-500/40", accent:"group-hover/f:text-violet-400" },
        { icon:<FiShield/>,      title:"Seguridad Máxima",  desc:"Protección total de tus datos",       from:"from-sky-500",    to:"to-sky-700",     glow:"shadow-sky-500/40",    accent:"group-hover/f:text-sky-400"    },
    ];

    return (
        <>
        <style>{estilos}</style>
        <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{fontFamily:"var(--font-ibm)"}}>

            {/* ═══════════════  FONDO AURORA  ═══════════════ */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-amber-500/20 blur-[100px]" />
                <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-violet-600/18 blur-[120px]" />
                <div className="orb3 absolute top-[30%] left-[35%] w-[500px] h-[500px] rounded-full bg-sky-500/12 blur-[90px]" />
                <div className="orb4 absolute top-[60%] left-[5%] w-[400px] h-[400px] rounded-full bg-amber-400/10 blur-[80px]" />

                <div className="grid-anim absolute inset-0"
                    style={{backgroundImage:"linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",backgroundSize:"80px 80px"}}
                />

                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_15%_50%,rgba(202,138,4,.12)_0%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_85%_50%,rgba(124,58,237,.10)_0%,transparent_70%)]" />

                {[
                    {top:"12%",left:"8%",  sz:"w-1.5 h-1.5", color:"bg-amber-400/60",  spd:"6s",  del:"0s"},
                    {top:"35%",left:"18%", sz:"w-1 h-1",      color:"bg-violet-400/50", spd:"9s",  del:"1s"},
                    {top:"65%",left:"12%", sz:"w-1 h-1",      color:"bg-sky-400/50",    spd:"7s",  del:"2s"},
                    {top:"80%",left:"30%", sz:"w-1.5 h-1.5",  color:"bg-amber-300/40",  spd:"11s", del:"3s"},
                    {top:"20%",right:"8%", sz:"w-1 h-1",      color:"bg-violet-300/50", spd:"8s",  del:"1.5s"},
                    {top:"50%",right:"5%", sz:"w-1.5 h-1.5",  color:"bg-sky-300/40",    spd:"12s", del:"4s"},
                    {top:"70%",right:"20%",sz:"w-1 h-1",      color:"bg-amber-400/40",  spd:"10s", del:"2.5s"},
                ].map((p,i) => (
                    <div key={i} className={`absolute ${p.sz} rounded-full ${p.color}`}
                        style={{top:p.top, left:p.left || undefined, right:p.right || undefined,
                                animation:`float-particle ${p.spd} ease-in-out infinite ${p.del}`}} />
                ))}

                <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}} />
            </div>

            {/* ═══════════════  COLUMNA IZQUIERDA  ═══════════════ */}
            <motion.div className="hidden lg:flex w-1/2 items-center justify-center z-10 relative" initial="oculto" animate="visible" variants={stagger}>
                <div className="flex flex-col items-center text-center p-12 max-w-lg w-full">
                    <motion.div variants={item} className="relative mb-10 group">
                        <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full scale-110 group-hover:scale-125 transition-transform duration-700" />
                        <Logo variant="map" width={260} height={260}
                            className="relative drop-shadow-[0_0_60px_rgba(202,138,4,.3)] hover:scale-[1.04] transition-transform duration-700 ease-out" />
                    </motion.div>

                    <motion.h2 variants={item} className="text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight" style={{fontFamily:"var(--font-outfit)"}}>
                        LogPose <span className="grad-text">Vzla</span>
                    </motion.h2>

                    <motion.p variants={item} className="text-slate-400 text-lg leading-relaxed max-w-sm">
                        Navegando el Grand Line de tus finanzas con precisión inquebrantable.
                    </motion.p>

                    <motion.div variants={item} className="mt-8 flex items-center gap-6 text-center">
                        {[{val:"100%",lbl:"Seguro"},{val:"∞",lbl:"Control"},{val:"24/7",lbl:"Disponible"}].map((s,i)=>(
                            <div key={i} className="flex flex-col">
                                <span className="text-2xl font-bold grad-text" style={{fontFamily:"var(--font-outfit)"}}>{s.val}</span>
                                <span className="text-xs text-slate-500 mt-0.5 uppercase tracking-widest">{s.lbl}</span>
                            </div>
                        ))}
                    </motion.div>

                    <motion.div variants={stagger} className="mt-10 grid grid-cols-1 gap-3 w-full">
                        {features.map((f,i)=>(
                            <motion.div key={i} variants={item}>
                                <div className="group/f flex items-center gap-4 p-4 rounded-2xl border border-white/[.07] bg-white/[.03] hover:bg-white/[.06] hover:border-white/[.14] backdrop-blur-sm transition-all duration-400 cursor-default">
                                    <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${f.from} ${f.to} shadow-lg ${f.glow} flex items-center justify-center text-white shrink-0 group-hover/f:scale-110 transition-transform duration-300`}>
                                        {f.icon}
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-white/90 font-semibold text-sm ${f.accent} transition-colors duration-300`}>{f.title}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>

            {/* ═══════════════  COLUMNA DERECHA — CARD  ═══════════════ */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-6 sm:p-10 z-10 relative">
                <motion.div className="w-full max-w-[430px]" initial="oculto" animate="visible" variants={stagger}>

                    {/* ── CARD PREMIUM ── */}
                    <motion.div variants={card} className="card-glow">
                        <div className="relative bg-[#0B0F1A] rounded-[1.75rem] p-8 sm:p-10 shadow-[0_30px_80px_-10px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.06)] overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-violet-500/20 to-transparent" />
                            
                            {/* Header */}
                            <motion.div variants={stagger} initial="oculto" animate="visible">
                                <motion.div variants={item} className="mb-8 relative z-10 text-center sm:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/[.06] mb-4">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-amber-400/80 text-xs font-medium tracking-wider uppercase">Acceso Biométrico</span>
                                    </div>
                                    <h1 className="text-4xl sm:text-[2.6rem] font-extrabold text-white leading-tight" style={{fontFamily:"var(--font-outfit)"}}>
                                        Bienvenido<span className="grad-text">.</span>
                                    </h1>
                                </motion.div>

                                {/* Form */}
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
                                    <motion.div variants={item}>
                                        <Input label="Correo Electrónico" type="email" placeholder="ejemplo@correo.com"
                                            icon={<FiMail/>} {...register("email")} error={errors.email} />
                                    </motion.div>
                                    <motion.div variants={item}>
                                        <Input label="Contraseña" type={showPassword?"text":"password"} placeholder="••••••••"
                                            icon={<FiLock/>} {...register("password")} error={errors.password}
                                            rightElement={
                                                <button type="button" onClick={()=>setShowPassword(!showPassword)}
                                                    className="text-slate-500 hover:text-amber-400 transition-colors duration-200 focus:outline-none cursor-pointer p-1">
                                                    {showPassword?<FiEyeOff size={18}/>:<FiEye size={18}/>}
                                                </button>
                                            }
                                        />
                                    </motion.div>

                                    <motion.div variants={item}>
                                        <button type="submit" disabled={loading}
                                            className="shimmer-btn relative w-full group bg-linear-to-r from-amber-600 via-amber-500 to-yellow-400 text-[#07090F] font-bold py-4 px-6 rounded-2xl shadow-[0_6px_30px_rgba(202,138,4,.45),inset_0_1px_0_rgba(255,255,255,.25)] hover:shadow-[0_10px_40px_rgba(202,138,4,.65)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                                            <span className="relative z-10 flex items-center gap-2 text-sm">
                                                {loading
                                                    ? <span className="w-5 h-5 border-2 border-[#07090F]/30 border-t-[#07090F] rounded-full animate-spin"/>
                                                    : <><span>Iniciar Sesión</span><FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1"/></>
                                                }
                                            </span>
                                        </button>
                                    </motion.div>
                                </form>

                                {/* Métodos Alternativos */}
                                <motion.div variants={item} className="relative my-7">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[.06]"/></div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-4 bg-[#0B0F1A] text-slate-600 uppercase tracking-widest font-medium">Métodos Premium</span>
                                    </div>
                                </motion.div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <motion.div variants={item}>
                                        <button onClick={handleGoogle} disabled={loading} type="button"
                                            className="w-full group flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-white/[.08] bg-white/[.03] hover:bg-white/[.07] hover:border-white/[.15] transition-all duration-300 text-white/85 font-medium text-xs cursor-pointer disabled:opacity-60">
                                            <FcGoogle size={18} className="shrink-0 group-hover:scale-110 transition-transform duration-300"/>
                                            Google
                                        </button>
                                    </motion.div>

                                    {biometricSupported && (
                                        <motion.div variants={item}>
                                            <button onClick={handleFaceID} disabled={loading} type="button"
                                                className="w-full group flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all duration-300 text-violet-100 font-medium text-xs cursor-pointer disabled:opacity-60">
                                                <FaceIdIcon className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform duration-300"/>
                                                Face ID
                                            </button>
                                        </motion.div>
                                    )}
                                </div>

                                <motion.p variants={item} className="mt-7 text-center text-sm text-slate-500 z-10 relative">
                                    ¿No tienes una cuenta?{" "}
                                    <Link href="/register" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors duration-200 ml-0.5">
                                        Regístrate aquí
                                    </Link>
                                </motion.p>
                            </motion.div>
                        </div>
                    </motion.div>

                    <motion.p variants={item} className="text-center text-xs text-slate-700 mt-5 hidden lg:block">
                        © {new Date().getFullYear()} LogPose Vzla Project. Designed by: Juan17md
                    </motion.p>
                </motion.div>
            </div>
        </div>
        </>
    );
}