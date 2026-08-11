"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiAlertOctagon, FiArrowLeft, FiDatabase, FiEdit, FiEye, FiFileText, FiGlobe, FiLock, FiMail, FiServer, FiShield, FiSliders, FiTrash2, FiUsers } from "react-icons/fi";
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
    icon: <FiShield />,
    titulo: "1. Responsable del Tratamiento",
    contenido:
      "LogPose VZLA (en adelante, 'la Aplicación') actúa como responsable del tratamiento de los datos personales recopilados a través de la plataforma. La Aplicación es un proyecto independiente de gestión financiera personal, por lo que los datos se tratan de forma autónoma y bajo responsabilidad directa de su desarrollador. Para cualquier comunicación relativa al tratamiento de tus datos puedes escribir a: juan9182morales@gmail.com. Al utilizar la Aplicación, confías tus datos personales y financieros a LogPose VZLA, y nos comprometemos a protegerlos conforme a las leyes de protección de datos aplicables, incluyendo la Ley Orgánica de Protección de Datos Personales de Venezuela (2022) y el Reglamento General de Protección de Datos (RGPD) de la Unión Europea en lo que resulte aplicable.",
  },
  {
    icon: <FiDatabase />,
    titulo: "2. Datos que Recopilamos",
    contenido:
      "Recopilamos las siguientes categorías de datos: (a) Datos de identificación y contacto: nombre completo, dirección de correo electrónico. (b) Datos financieros: saldos de cuentas, transacciones de ingresos y gastos, deudas, metas de ahorro, gastos fijos, listas de compras y presupuestos mensuales. (c) Datos de uso: interacciones con el asistente Nami, preferencias de moneda y configuración de la cuenta. (d) Datos técnicos: tipo de dispositivo, sistema operativo, navegador y versión de la aplicación. (e) Datos de voz y texto del asistente: cuando utilizas el asistente Nami procesamos tus mensajes de texto y, si usas la entrada por voz (Web Speech API), la transcripción generada en tu dispositivo; no almacenamos grabaciones de audio. No recopilamos datos biométricos, de ubicación GPS ni información de contactos del dispositivo.",
  },
  {
    icon: <FiLock />,
    titulo: "3. Finalidad del Tratamiento",
    contenido:
      "Tus datos se procesan con las siguientes finalidades: (a) Proveer y mantener las funcionalidades de organización financiera de la Aplicación. (b) Procesar comandos del asistente Nami para registrar y gestionar tus finanzas. (c) Generar reportes y análisis financieros personalizados. (d) Enviar comunicaciones relacionadas con tu cuenta y alertas financieras. (e) Mejorar la experiencia de usuario y corregir errores técnicos. No utilizamos tus datos para fines publicitarios ni los vendemos a terceros bajo ninguna circunstancia.",
  },
  {
    icon: <FiServer />,
    titulo: "4. Base Legal del Tratamiento",
    contenido:
      "El tratamiento de tus datos se fundamenta en: (a) La ejecución del contrato de servicios aceptado al registrarte en la Aplicación. (b) Tu consentimiento explícito, otorgado al aceptar la presente Política de Privacidad. (c) El interés legítimo de mejorar la seguridad y funcionalidad de la plataforma. Puedes retirar tu consentimiento en cualquier momento solicitando la eliminación de tu cuenta, lo que implicará la finalización del servicio.",
  },
  {
    icon: <FiUsers />,
    titulo: "5. Destinatarios y Encargados del Tratamiento",
    contenido:
      "Tus datos se almacenan en Firebase (Google Cloud Platform), cuyos servidores pueden estar ubicados en Estados Unidos y otros países. Google Cloud cumple con certificaciones ISO 27001 y SOC 2. El asistente Nami procesa tus solicitudes a través de la API de Groq (modelo Llama 3.3): junto con tu mensaje se transmite un resumen del contexto financiero de tu cuenta (saldos, movimientos recientes, metas, deudas y gastos fijos) necesario para responder de forma precisa. La transmisión se realiza cifrada (TLS) y Groq no utiliza estos datos para entrenar modelos ni los conserva más allá de lo estrictamente necesario para responder. No compartimos tus datos financieros con ninguna otra entidad sin tu consentimiento explícito, salvo obligación legal.",
  },
  {
    icon: <FiGlobe />,
    titulo: "6. Transferencias Internacionales de Datos",
    contenido:
      "Al utilizar la Aplicación, tus datos pueden ser transferidos y procesados fuera del país en el que residas, principalmente en los Estados Unidos (Google Cloud) y en los servidores de los proveedores de IA contratados. Estas transferencias se realizan con garantías adecuadas: Google Cloud mantiene certificaciones ISO 27001 y SOC 2 y, cuando aplica, cláusulas contractuales tipo aprobadas para la transferencia de datos desde la Unión Europea. Al aceptar la presente Política, consientes estas transferencias internacionales.",
  },
  {
    icon: <FiEye />,
    titulo: "7. Tus Derechos",
    contenido:
      "Tienes derecho a: (a) Acceder a tus datos personales y financieros en cualquier momento desde la Aplicación. (b) Rectificar datos inexactos o incompletos. (c) Solicitar la eliminación de tus datos (derecho al olvido). (d) Limitar u oponerte al tratamiento de tus datos. (e) Portar tus datos a otro servicio en un formato estructurado. Para ejercer cualquiera de estos derechos, puedes hacerlo desde la sección de Perfil de la Aplicación o contactándonos directamente. Responderemos a tu solicitud en un plazo máximo de 30 días.",
  },
  {
    icon: <FiTrash2 />,
    titulo: "8. Conservación y Eliminación de Datos",
    contenido:
      "Conservamos tus datos mientras mantengas una cuenta activa en la Aplicación. Al eliminar tu cuenta, todos tus datos financieros serán eliminados permanentemente en un plazo máximo de 30 días. El historial de conversaciones con el asistente Nami se conserva únicamente mientras tu cuenta permanezca activa y se elimina de forma permanente junto con tus datos. Las copias de seguridad (backups) pueden conservar datos cifrados hasta 90 días adicionales, tras los cuales se purgan automáticamente. Los datos anonimizados utilizados para análisis estadísticos podrán conservarse de forma indefinida, pero no podrán vincularse a tu identidad.",
  },
  {
    icon: <FiSliders />,
    titulo: "9. Cookies y Tecnologías Similares",
    contenido:
      "La Aplicación utiliza cookies estrictamente necesarias para el funcionamiento de la sesión de usuario y la persistencia de autenticación. Estas cookies son efímeras y se eliminan al cerrar la sesión. No utilizamos cookies de rastreo, publicitarias ni de terceros. El almacenamiento local (localStorage e IndexedDB) se utiliza exclusivamente para la persistencia offline de la sesión y la caché de Firestore, como se describe en nuestra documentación técnica.",
  },
  {
    icon: <FiAlertOctagon />,
    titulo: "10. Seguridad y Notificación de Brechas",
    contenido:
      "Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos, incluyendo cifrado en tránsito (TLS) y en reposo, autenticación segura y control de accesos basado en tu identidad. En caso de una brecha de seguridad que afecte tus datos personales, te notificaremos a través de la Aplicación o del correo electrónico registrado sin demora injustificada y, cuando la normativa lo exija, notificaremos también a la autoridad de protección de datos competente.",
  },
  {
    icon: <FiEdit />,
    titulo: "11. Cambios a esta Política",
    contenido:
      "Podremos actualizar esta Política de Privacidad periódicamente para reflejar cambios legales, técnicos o del servicio. Publicaremos la versión actualizada en esta página e indicaremos la fecha de última actualización. Si los cambios son sustanciales, te avisaremos con al menos 15 días de antelación a través de la Aplicación o del correo electrónico registrado. El uso continuado de la Aplicación tras la entrada en vigor de los cambios implica la aceptación de la versión actualizada.",
  },
  {
    icon: <FiFileText />,
    titulo: "12. Registro de Datos y Autoridad de Supervisión",
    contenido:
      "De conformidad con la Ley Orgánica de Protección de Datos Personales de la República Bolivariana de Venezuela (2022), la base de datos de la Aplicación será inscrita en el registro correspondiente ante la autoridad competente en materia de datos personales. Si consideras que el tratamiento de tus datos vulnera tus derechos, puedes presentar una reclamación ante dicha autoridad, o ante la autoridad de control de tu país de residencia si te encuentras en la Unión Europea, sin perjuicio de ejercer previamente tus derechos ante LogPose VZLA.",
  },
  {
    icon: <FiMail />,
    titulo: "13. Contacto de Protección de Datos",
    contenido:
      "Para cualquier consulta, solicitud o reclamación relacionada con el tratamiento de tus datos personales, puedes escribirnos a juan9182morales@gmail.com. Nos comprometemos a responder todas las solicitudes en un plazo máximo de 5 días hábiles y a resolverlas dentro del plazo máximo de 30 días previsto por la normativa aplicable.",
  },
];

export default function PrivacidadPage() {
  return (
    <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{ fontFamily: "var(--font-ibm)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-violet-500/20 blur-[100px]" />
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
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-500/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-amber-500/20 to-transparent" />

              <motion.div variants={stagger} initial="oculto" animate="visible">
                <motion.div variants={item} className="flex items-center gap-4 mb-8">
                  <Link
                    href="/login"
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 text-slate-400 hover:text-amber-400 transition-all duration-200 cursor-pointer"
                  >
                    <FiArrowLeft size={18} />
                  </Link>
                  <div className="flex items-center gap-3">
                    <Logo variant="icon" width={36} height={36} />
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-outfit)" }}>
                      Política de <span className="grad-text">Privacidad</span>
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
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500/20 to-violet-700/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
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
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link
                      href="/derechos"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Derechos ARCO
                    </Link>
                    <Link
                      href="/aviso-legal"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Aviso Legal
                    </Link>
                    <Link
                      href="/terminos"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Términos y Condiciones
                    </Link>
                    <Link
                      href="/login"
                      className="text-xs text-amber-500 hover:text-amber-400 font-semibold transition-colors duration-200"
                    >
                      Volver al inicio
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
