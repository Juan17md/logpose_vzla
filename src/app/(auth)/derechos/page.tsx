"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiArrowLeft, FiDatabase, FiEdit, FiEye, FiEyeOff, FiLock, FiMail, FiSend, FiTrash2, FiUser } from "react-icons/fi";
import Logo from "@/components/layout/Logo";
import Input from "@/components/ui/forms/Input";
import Textarea from "@/components/ui/forms/Textarea";
import { Outfit, IBM_Plex_Sans } from "next/font/google";
import "../aurora.css";

const outfit = Outfit({ variable: "--font-outfit", weight: ["400","500","600","700","800"], subsets: ["latin"] });
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm", weight: ["300","400","500","600","700"], subsets: ["latin"] });

const stagger = { oculto: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const item = {
  oculto: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const card = {
  oculto: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const derechosDisponibles = [
  { id: "acceso", label: "Acceso", descripcion: "Conocer qué datos tuyos tratamos y cómo", icon: <FiEye /> },
  { id: "rectificacion", label: "Rectificación", descripcion: "Corregir datos inexactos o incompletos", icon: <FiEdit /> },
  { id: "eliminacion", label: "Eliminación", descripcion: "Solicitar el borrado de tus datos (derecho al olvido)", icon: <FiTrash2 /> },
  { id: "limitacion", label: "Limitación / Oposición", descripcion: "Limitar u oponerte a un tratamiento concreto", icon: <FiEyeOff /> },
  { id: "portabilidad", label: "Portabilidad", descripcion: "Recibir tus datos en un formato estructurado", icon: <FiDatabase /> },
];

export default function DerechosPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState("");

  const toggleDerecho = (id: string) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("Ingresa tu nombre completo");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos un derecho a ejercer");
      return;
    }
    if (!descripcion.trim()) {
      toast.error("Describe brevemente tu solicitud");
      return;
    }

    const derechosTexto = derechosDisponibles.filter((d) => seleccionados.includes(d.id)).map((d) => d.label);
    const asunto = encodeURIComponent(`Solicitud de derechos de datos personales — ${nombre}`);
    const cuerpo = encodeURIComponent(
      [
        "Hola, quiero ejercer mis derechos de protección de datos personales:",
        "",
        `Nombre completo: ${nombre}`,
        `Correo de la cuenta: ${email}`,
        `Derechos solicitados: ${derechosTexto.join(", ")}`,
        "",
        `Descripción: ${descripcion}`,
        "",
        "Atentamente, en virtud de la Ley Orgánica de Protección de Datos Personales (Venezuela, 2022).",
      ].join("\n")
    );
    window.location.href = `mailto:juan9182morales@gmail.com?subject=${asunto}&body=${cuerpo}`;
    toast.success("Se abrirá tu cliente de correo con la solicitud prediseñada. Recibirás respuesta en un plazo máximo de 30 días.");
  };

  return (
    <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{ fontFamily: "var(--font-ibm)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-violet-500/18 blur-[100px]" />
        <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-teal-600/14 blur-[120px]" />
        <div className="orb3 absolute top-[30%] left-[35%] w-[500px] h-[500px] rounded-full bg-amber-500/12 blur-[90px]" />
        <div className="grid-anim grid-pattern absolute inset-0" />
        <div className="glow-left absolute inset-0" />
        <div className="glow-right absolute inset-0" />
      </div>

      <div className="w-full min-h-screen flex items-center justify-center px-4 py-12 sm:p-10 z-10 relative">
        <div className="w-full max-w-[820px]">
          <div className="card-glow">
            <div className="relative bg-[#0B0F1A] rounded-[1.75rem] p-8 sm:p-12 shadow-lg overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-500/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-teal-500/20 to-transparent" />

              <div>
                <div className="flex items-center gap-4 mb-8">
                  <Link
                    href="/privacidad"
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 text-slate-400 hover:text-amber-400 transition-colors duration-200 cursor-pointer"
                  >
                    <FiArrowLeft size={18} />
                  </Link>
                  <div className="flex items-center gap-3">
                    <Logo variant="icon" width={36} height={36} />
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-outfit)" }}>
                      Ejercicio de <span className="grad-text">Derechos de Datos</span>
                    </h1>
                  </div>
                </div>

                <p className="text-slate-500 text-sm mb-10 border-b border-slate-800/60 pb-6">
                  Formulario de solicitud de derechos ARCO — Respuesta en un plazo máximo de 30 días. Última actualización: 2 de agosto de 2026.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-4">Derechos que deseas ejercer</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {derechosDisponibles.map((d) => {
                        const activo = seleccionados.includes(d.id);
                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => toggleDerecho(d.id)}
                            role="checkbox"
                            aria-checked={activo}
                            className={`text-left flex items-start gap-3 p-4 rounded-2xl border transition-colors duration-300 cursor-pointer ${
                              activo
                                ? "border-amber-500/50 bg-amber-500/10 shadow-lg"
                                : "border-slate-700/50 bg-[#0A0E1A]/60 hover:border-slate-600/60 hover:bg-[#0A0E1A]"
                            }`}
                          >
                            <div className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-colors duration-300 ${activo ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-slate-700/60 text-slate-500"}`}>
                              {d.icon}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-bold mb-0.5 ${activo ? "text-white" : "text-slate-300"}`}>{d.label}</p>
                              <p className={`text-xs leading-snug ${activo ? "text-violet-300/80" : "text-slate-500"}`}>{d.descripcion}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      label="Nombre completo"
                      placeholder="Ej. María Pérez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      icon={<FiUser size={16} />}
                    />
                    <Input
                      label="Correo de tu cuenta"
                      type="email"
                      placeholder="tucorreo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<FiMail size={16} />}
                    />
                  </div>

                  <div>
                    <Textarea
                      label="Describe tu solicitud"
                      placeholder="Ej. Deseo que elimines todos mis datos personales y financieros de la plataforma..."
                      rows={4}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      icon={<FiLock size={16} />}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Al enviar, se abrirá tu cliente de correo con la solicitud prellenada hacia{" "}
                      <span className="text-slate-400">juan9182morales@gmail.com</span>. Te responderemos en un plazo máximo de 30 días.
                    </p>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:brightness-110 active:scale-[0.98] transition-[transform,color] duration-300 cursor-pointer"
                    >
                      <FiSend size={15} />
                      Enviar solicitud
                    </button>
                  </div>
                </form>

                <div className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">
                    © {new Date().getFullYear()} LogPose Vzla Project. Designed by: Juan17md
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/terminos"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Términos
                    </Link>
                    <Link
                      href="/aviso-legal"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Aviso Legal
                    </Link>
                    <Link
                      href="/privacidad"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Privacidad
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
