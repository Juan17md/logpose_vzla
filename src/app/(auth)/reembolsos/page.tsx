"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiClock, FiCreditCard, FiDollarSign, FiHeadphones, FiRotateCcw, FiXCircle } from "react-icons/fi";
import Logo from "@/components/layout/Logo";
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

const secciones = [
  {
    icon: <FiCreditCard />,
    titulo: "1. Ámbito de esta Política",
    contenido:
      "La presente Política de Reembolsos y Cancelación regula la gestión de las solicitudes de reembolso relacionadas con la suscripción Premium de la aplicación LogPose VZLA (en adelante, 'la Aplicación'). Forma parte integrante de los Términos y Condiciones y de la Política de Privacidad. Esta política se aplica exclusivamente a los pagos realizados para la suscripción Premium; el plan gratuito no genera ningún tipo de cargo.",
  },
  {
    icon: <FiRotateCcw />,
    titulo: "2. Naturaleza de los Pagos",
    contenido:
      "La suscripción Premium es un servicio de carácter digital con periodicidad mensual. El procesamiento de pagos se encuentra actualmente en proceso de integración con una pasarela de pago autorizada; al estar operativa, los cargos se procesan de forma anticipada por cada período mensual. Al no tratarse de un producto físico, la legislación sobre desistimiento de bienes materiales no resulta directamente aplicable, sin perjuicio de los supuestos de reembolso previstos en esta política y de cualquier derecho reconocido por la legislación aplicable.",
  },
  {
    icon: <FiCheckCircle />,
    titulo: "3. Casos con Derecho a Reembolso",
    contenido:
      "Tendrás derecho al reembolso íntegro de la cantidad pagada cuando: (a) exista un cobro duplicado o un error en el cobro no atribuible al usuario; (b) se haya cargado un monto superior al precio publicado; (c) el servicio Premium haya estado indisponible de forma prolongada e injustificada durante el período facturado; o (d) tu cuenta haya sido cancelada por causas imputables a LogPose VZLA y no por incumplimiento del usuario. En estos casos, podrás solicitar el reembolso en un plazo máximo de 30 días naturales desde la fecha del cargo.",
  },
  {
    icon: <FiXCircle />,
    titulo: "4. Casos sin Derecho a Reembolso",
    contenido:
      "No se concederán reembolsos en los siguientes supuestos: (a) cancelación voluntaria de la suscripción por decisión del usuario, salvo que la legislación aplicable disponga lo contrario; (b) no utilización de las funcionalidades Premium durante el período facturado; (c) cambio de precio o de plan notificado con la antelación correspondiente establecida en los Términos y Condiciones; (d) suspensión o cancelación de la cuenta por incumplimiento de los Términos y Condiciones o por conducta prohibida; (e) registros de datos inexactos introducidos por el usuario.",
  },
  {
    icon: <FiDollarSign />,
    titulo: "5. Moneda y Forma del Reembolso",
    contenido:
      "Los reembolsos se realizarán en la misma moneda y a través del mismo método de pago utilizado originalmente, salvo que circunstancias técnicas impidan la reversión del cargo, en cuyo caso se efectuará por transferencia equivalente a la tasa de cambio del BCV vigente en la fecha del reembolso. En caso del pago en bolívares, el monto devuelto será el equivalente al importe originalmente cobrado.",
  },
  {
    icon: <FiClock />,
    titulo: "6. Procedimiento y Plazos",
    contenido:
      "Para solicitar un reembolso debes escribir a juan9182morales@gmail.com incluyendo: (a) tu nombre completo y correo de la cuenta; (b) la fecha del cargo; (c) el monto cobrado; y (d) el motivo del reembolso y, cuando aplique, la evidencia del error. LogPose VZLA atenderá tu solicitud en un plazo máximo de 5 días hábiles. Cuando proceda, el reembolso se efectuará en un plazo máximo de 14 días hábiles desde la aprobación, dependiendo del método de pago y de la pasarela contratada.",
  },
  {
    icon: <FiAlertTriangle />,
    titulo: "7. Contracargos",
    contenido:
      "Se recomienda contactar primero con LogPose VZLA antes de presentar un contracargo (chargeback) ante tu banco o emisor, ya que la mayoría de los casos pueden resolverse directamente de forma más rápida. La presentación de contracargos infundados o reiterados podrá dar lugar al bloqueo preventivo de la cuenta hasta la resolución de la disputa. En caso de disputa, buscamos resolverla de forma transparente y conforme a la presente política.",
  },
  {
    icon: <FiHeadphones />,
    titulo: "8. Modificaciones y Contacto",
    contenido:
      "Podemos actualizar esta Política de Reembolsos para reflejar cambios legales, tarifarios u operativos, notificando los cambios sustanciales con al menos 15 días de antelación, conformidad con los Términos y Condiciones. Para cualquier consulta relativa a esta política, solicitud de reembolso o disputa, puedes escribirnos a juan9182morales@gmail.com. Responderemos dentro de los plazos indicados en esta política.",
  },
];

export default function ReembolsosPage() {
  return (
    <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{ fontFamily: "var(--font-ibm)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-teal-500/18 blur-[100px]" />
        <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-amber-600/16 blur-[120px]" />
        <div className="orb3 absolute top-[30%] left-[35%] w-[500px] h-[500px] rounded-full bg-sky-500/12 blur-[90px]" />
        <div className="grid-anim grid-pattern absolute inset-0" />
        <div className="glow-left absolute inset-0" />
        <div className="glow-right absolute inset-0" />
      </div>

      <div className="w-full min-h-screen flex items-center justify-center px-4 py-12 sm:p-10 z-10 relative">
        <motion.div className="w-full max-w-[820px]" initial="oculto" animate="visible" variants={stagger}>
          <motion.div variants={card} className="card-glow">
            <div className="relative bg-[#0B0F1A] rounded-[1.75rem] p-8 sm:p-12 shadow-[0_30px_80px_-10px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.06)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-teal-500/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-amber-500/20 to-transparent" />

              <motion.div variants={stagger} initial="oculto" animate="visible">
                <motion.div variants={item} className="flex items-center gap-4 mb-8">
                  <Link
                    href="/terminos"
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 text-slate-400 hover:text-amber-400 transition-all duration-200 cursor-pointer"
                  >
                    <FiArrowLeft size={18} />
                  </Link>
                  <div className="flex items-center gap-3">
                    <Logo variant="icon" width={36} height={36} />
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-outfit)" }}>
                      Política de <span className="grad-text">Reembolsos</span>
                    </h1>
                  </div>
                </motion.div>

                <motion.p variants={item} className="text-slate-500 text-sm mb-10 border-b border-slate-800/60 pb-6">
                  Última actualización: 2 de agosto de 2026
                </motion.p>

                <div className="space-y-10">
                  {secciones.map((s, i) => (
                    <motion.div key={i} variants={item} className="group">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-teal-500/20 to-teal-700/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                          {s.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg sm:text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-outfit)" }}>
                            {s.titulo}
                          </h2>
                          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                            {s.contenido}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div variants={item} className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">
                    © {new Date().getFullYear()} LogPose Vzla Project. Designed by: Juan17md
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/aviso-legal"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Aviso Legal
                    </Link>
                    <Link
                      href="/derechos"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Derechos ARCO
                    </Link>
                    <Link
                      href="/privacidad"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Privacidad
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}