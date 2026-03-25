"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { FiLock, FiArrowRight, FiEye, FiEyeOff, FiMail, FiShield, FiCheck, FiKey } from "react-icons/fi";
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
  .card-glow { position:relative; }
  .card-glow::before {
    content:'';
    position:absolute; inset:-1px; border-radius:1.75rem; z-index:0;
    background: conic-gradient(from var(--angle,0deg), #0EA5E9 0%, #CA8A04 25%, #7C3AED 50%, #CA8A04 75%, #0EA5E9 100%);
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

const esquemaContrasena = z.object({
    contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmarContrasena: z.string().min(6, "Confirma tu contraseña"),
}).refine((data) => data.contrasena === data.confirmarContrasena, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarContrasena"],
});

type DatosFormulario = z.infer<typeof esquemaContrasena>;

export default function CrearContrasenaPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [verificandoAuth, setVerificandoAuth] = useState(true);
    const [correoUsuario, setCorreoUsuario] = useState("");

    const { register, handleSubmit, formState: { errors } } = useForm<DatosFormulario>({
        resolver: zodResolver(esquemaContrasena),
    });

    useEffect(() => {
        const usuario = auth.currentUser;
        if (!usuario) {
            router.push("/login");
            return;
        }

        // Verificar si ya tiene proveedor de contraseña
        const tienePassword = usuario.providerData.some(p => p.providerId === "password");
        if (tienePassword) {
            router.push("/dashboard");
            return;
        }

        setCorreoUsuario(usuario.email || "");
        setVerificandoAuth(false);
    }, [router]);

    const onSubmit = async (datos: DatosFormulario) => {
        setLoading(true);
        try {
            const usuario = auth.currentUser;
            if (!usuario || !usuario.email) {
                toast.error("Error", { description: "No se encontró un usuario autenticado." });
                router.push("/login");
                return;
            }

            // Vincular contraseña a la cuenta de Google existente
            const credencial = EmailAuthProvider.credential(usuario.email, datos.contrasena);
            await linkWithCredential(usuario, credencial);

            // Asegurar que el documento de usuario existe en Firestore
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

            toast.success("¡Contraseña creada!", {
                description: "Ahora puedes iniciar sesión con correo y contraseña.",
            });
            router.push("/dashboard");
        } catch (error: unknown) {
            let msg = "Ocurrió un error al crear la contraseña.";
            if (error && typeof error === "object" && "code" in error) {
                const firebaseError = error as { code: string };
                if (firebaseError.code === "auth/email-already-in-use") {
                    msg = "Este correo ya tiene una contraseña asociada.";
                } else if (firebaseError.code === "auth/weak-password") {
                    msg = "La contraseña es muy débil. Usa al menos 6 caracteres.";
                } else if (firebaseError.code === "auth/requires-recent-login") {
                    msg = "Tu sesión ha expirado. Inicia sesión con Google nuevamente.";
                    setTimeout(() => router.push("/login"), 2000);
                } else if (firebaseError.code === "auth/provider-already-linked") {
                    msg = "Ya tienes una contraseña asociada a esta cuenta.";
                    setTimeout(() => router.push("/dashboard"), 2000);
                }
            }
            toast.error("Error", { description: msg });
        } finally {
            setLoading(false);
        }
    };

    const beneficios = [
        { icon: <FiKey />,    titulo: "Acceso Dual",         desc: "Ingresa con Google o correo y contraseña" },
        { icon: <FiShield />, titulo: "Mayor Seguridad",     desc: "Capa extra de protección para tu cuenta" },
        { icon: <FiCheck />,  titulo: "Acceso Garantizado",  desc: "Siempre podrás acceder a tu cuenta" },
    ];

    if (verificandoAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#06080F]">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
        <style>{estilos}</style>
        <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{fontFamily:"var(--font-ibm)"}}>

            {/* FONDO AURORA */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-sky-500/18 blur-[100px]" />
                <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-amber-600/16 blur-[120px]" />
                <div className="orb3 absolute top-[30%] left-[35%] w-[500px] h-[500px] rounded-full bg-violet-500/12 blur-[90px]" />
                <div className="orb4 absolute top-[60%] left-[5%] w-[400px] h-[400px] rounded-full bg-sky-400/10 blur-[80px]" />
                <div className="grid-anim absolute inset-0"
                    style={{backgroundImage:"linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",backgroundSize:"80px 80px"}}
                />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_15%_50%,rgba(14,165,233,.12)_0%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_85%_50%,rgba(202,138,4,.09)_0%,transparent_70%)]" />
                {[
                    {top:"12%",left:"8%",  sz:"w-1.5 h-1.5", color:"bg-sky-400/60",    spd:"6s",  del:"0s"},
                    {top:"35%",left:"18%", sz:"w-1 h-1",      color:"bg-amber-400/50",  spd:"9s",  del:"1s"},
                    {top:"65%",left:"12%", sz:"w-1 h-1",      color:"bg-violet-400/50", spd:"7s",  del:"2s"},
                    {top:"80%",left:"30%", sz:"w-1.5 h-1.5",  color:"bg-sky-300/40",    spd:"11s", del:"3s"},
                    {top:"20%",right:"8%", sz:"w-1 h-1",      color:"bg-amber-300/50",  spd:"8s",  del:"1.5s"},
                    {top:"50%",right:"5%", sz:"w-1.5 h-1.5",  color:"bg-violet-300/40", spd:"12s", del:"4s"},
                    {top:"70%",right:"20%",sz:"w-1 h-1",      color:"bg-sky-400/40",    spd:"10s", del:"2.5s"},
                ].map((p,i)=>(
                    <div key={i} className={`absolute ${p.sz} rounded-full ${p.color}`}
                        style={{top:p.top, left:p.left||undefined, right:p.right||undefined,
                                animation:`float-particle ${p.spd} ease-in-out infinite ${p.del}`}}/>
                ))}
                <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>
            </div>

            {/* COLUMNA IZQUIERDA */}
            <motion.div className="hidden lg:flex w-1/2 items-center justify-center z-10 relative" initial="oculto" animate="visible" variants={stagger}>
                <div className="flex flex-col items-center text-center p-12 max-w-lg w-full">
                    <motion.div variants={item} className="relative mb-10 group">
                        <div className="absolute inset-0 bg-sky-500/20 blur-[60px] rounded-full scale-110 group-hover:scale-125 transition-transform duration-700"/>
                        <Logo variant="map" width={260} height={260}
                            className="relative drop-shadow-[0_0_60px_rgba(14,165,233,.35)] hover:scale-[1.04] transition-transform duration-700 ease-out"/>
                    </motion.div>
                    <motion.h2 variants={item} className="text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight" style={{fontFamily:"var(--font-outfit)"}}>
                        LogPose <span className="grad-text">Vzla</span>
                    </motion.h2>
                    <motion.p variants={item} className="text-slate-400 text-lg leading-relaxed max-w-sm">
                        Protege tu acceso financiero con una contraseña segura.
                    </motion.p>
                    <motion.div variants={item} className="mt-8 flex items-center gap-6 text-center">
                        {[{val:"🔒",lbl:"Seguro"},{val:"🔑",lbl:"Dual"},{val:"✓",lbl:"Fácil"}].map((s,i)=>(
                            <div key={i} className="flex flex-col">
                                <span className="text-2xl font-bold" style={{fontFamily:"var(--font-outfit)"}}>{s.val}</span>
                                <span className="text-xs text-slate-500 mt-0.5 uppercase tracking-widest">{s.lbl}</span>
                            </div>
                        ))}
                    </motion.div>
                    <motion.div variants={stagger} className="mt-10 grid grid-cols-1 gap-3 w-full">
                        {beneficios.map((b,i)=>(
                            <motion.div key={i} variants={item}>
                                <div className="group/f flex items-center gap-4 p-4 rounded-2xl border border-white/[.07] bg-white/[.03] hover:bg-white/[.06] hover:border-white/[.14] backdrop-blur-sm transition-all duration-400 cursor-default">
                                    <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${i===0?"from-sky-500 to-sky-700 shadow-sky-500/40":i===1?"from-amber-500 to-amber-700 shadow-amber-500/40":"from-emerald-500 to-emerald-700 shadow-emerald-500/40"} shadow-lg flex items-center justify-center text-white shrink-0 group-hover/f:scale-110 transition-transform duration-300`}>
                                        {b.icon}
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-white/90 font-semibold text-sm ${i===0?"group-hover/f:text-sky-400":i===1?"group-hover/f:text-amber-400":"group-hover/f:text-emerald-400"} transition-colors duration-300`}>{b.titulo}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{b.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>

            {/* COLUMNA DERECHA — CARD */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-6 sm:p-10 z-10 relative">
                <motion.div className="w-full max-w-[430px]" initial="oculto" animate="visible" variants={stagger}>

                    {/* CARD PREMIUM */}
                    <motion.div variants={card} className="card-glow">
                        <div className="relative bg-[#0B0F1A] rounded-[1.75rem] p-8 sm:p-10 shadow-[0_30px_80px_-10px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.06)] overflow-hidden">

                            {/* Mobile logo */}
                            <motion.div variants={item} className="lg:hidden flex flex-col items-center mb-6 relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-amber-500/15 blur-[25px] rounded-full scale-110" />
                                    <Logo variant="dark" width={160} height={72} className="relative" />
                                </div>
                            </motion.div>

                            {/* Inner highlights */}
                            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-500/40 to-transparent"/>
                            <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-amber-500/20 to-transparent"/>
                            <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/[.07] rounded-full blur-[80px] pointer-events-none"/>
                            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-amber-600/[.06] rounded-full blur-[70px] pointer-events-none"/>

                            {/* Corner decorations */}
                            <div className="absolute top-6 right-6 w-16 h-16 border border-sky-500/10 rounded-full"/>
                            <div className="absolute top-8 right-8 w-10 h-10 border border-sky-500/15 rounded-full"/>
                            <div className="absolute bottom-6 left-6 flex items-center gap-1.5">
                                {[0,1,2].map(i=><div key={i} className={`w-1.5 h-1.5 rounded-full ${i===0?"bg-sky-500/60":i===1?"bg-amber-500/40":"bg-emerald-500/30"}`}/>)}
                            </div>

                            <motion.div variants={stagger} initial="oculto" animate="visible">
                                <motion.div variants={item} className="mb-8 relative z-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/[.06] mb-4">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"/>
                                        <span className="text-sky-400/80 text-xs font-medium tracking-wider uppercase">Un paso más</span>
                                    </div>
                                    <h1 className="text-4xl sm:text-[2.6rem] font-extrabold text-white leading-tight" style={{fontFamily:"var(--font-outfit)"}}>
                                        Crear Contraseña<span className="grad-text">.</span>
                                    </h1>
                                    <p className="text-slate-500 text-sm mt-2">Establece una contraseña para acceder con tu correo</p>
                                </motion.div>

                                {/* Correo del usuario (solo lectura) */}
                                <motion.div variants={item} className="mb-5 relative z-10">
                                    <Input
                                        label="Correo Electrónico"
                                        type="email"
                                        value={correoUsuario}
                                        readOnly
                                        icon={<FiMail/>}
                                        className="opacity-60 cursor-not-allowed"
                                    />
                                </motion.div>

                                {/* Form */}
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
                                    <motion.div variants={item}>
                                        <Input label="Nueva Contraseña" type={mostrarContrasena?"text":"password"} placeholder="Mínimo 6 caracteres"
                                            icon={<FiLock/>} {...register("contrasena")} error={errors.contrasena}
                                            rightElement={
                                                <button type="button" onClick={()=>setMostrarContrasena(!mostrarContrasena)}
                                                    className="text-slate-500 hover:text-amber-400 transition-colors duration-200 focus:outline-none cursor-pointer p-1">
                                                    {mostrarContrasena?<FiEyeOff size={18}/>:<FiEye size={18}/>}
                                                </button>
                                            }
                                        />
                                    </motion.div>
                                    <motion.div variants={item}>
                                        <Input label="Confirmar Contraseña" type={mostrarConfirmar?"text":"password"} placeholder="Repite tu contraseña"
                                            icon={<FiLock/>} {...register("confirmarContrasena")} error={errors.confirmarContrasena}
                                            rightElement={
                                                <button type="button" onClick={()=>setMostrarConfirmar(!mostrarConfirmar)}
                                                    className="text-slate-500 hover:text-amber-400 transition-colors duration-200 focus:outline-none cursor-pointer p-1">
                                                    {mostrarConfirmar?<FiEyeOff size={18}/>:<FiEye size={18}/>}
                                                </button>
                                            }
                                        />
                                    </motion.div>

                                    {/* CTA */}
                                    <motion.div variants={item}>
                                        <button type="submit" disabled={loading}
                                            className="shimmer-btn relative w-full group bg-linear-to-r from-amber-600 via-amber-500 to-yellow-400 text-[#07090F] font-bold py-4 px-6 rounded-2xl shadow-[0_6px_30px_rgba(202,138,4,.45),inset_0_1px_0_rgba(255,255,255,.25)] hover:shadow-[0_10px_40px_rgba(202,138,4,.65)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                                            <span className="relative z-10 flex items-center gap-2 text-sm">
                                                {loading
                                                    ? <span className="w-5 h-5 border-2 border-[#07090F]/30 border-t-[#07090F] rounded-full animate-spin"/>
                                                    : <><span>Crear Contraseña</span><FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1"/></>
                                                }
                                            </span>
                                        </button>
                                    </motion.div>
                                </form>

                                {/* Info adicional */}
                                <motion.div variants={item} className="mt-6 p-4 rounded-xl border border-white/[.06] bg-white/[.02] relative z-10">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <FiShield className="text-sky-400" size={14}/>
                                        </div>
                                        <div>
                                            <p className="text-white/80 text-xs font-medium">¿Por qué crear una contraseña?</p>
                                            <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                                                Al crear una contraseña, podrás acceder a tu cuenta tanto con Google como con tu correo y contraseña, dándote mayor flexibilidad y seguridad.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
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
