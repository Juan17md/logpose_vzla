"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiAlertTriangle, FiAward, FiArrowLeft, FiBookOpen, FiCheckCircle, FiCreditCard, FiDollarSign, FiFileText, FiGlobe, FiHeadphones, FiLock, FiServer, FiShield, FiShieldOff, FiUserCheck, FiUsers, FiXCircle } from "react-icons/fi";
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
    icon: <FiFileText />,
    titulo: "1. Aceptación de los Términos",
    contenido:
      "Al crear una cuenta o utilizar la aplicación LogPose VZLA (en adelante, 'la Aplicación'), declaras haber leído, entendido y aceptado los presentes Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, debes abstenerte de utilizar la Aplicación. LogPose VZLA se reserva el derecho de modificar estos términos en cualquier momento, notificando los cambios a través de la Aplicación o por correo electrónico con al menos 15 días de antelación.",
  },
  {
    icon: <FiUserCheck />,
    titulo: "2. Registro y Cuenta de Usuario",
    contenido:
      "Para acceder a las funcionalidades de la Aplicación, debes registrarte proporcionando tu nombre completo, dirección de correo electrónico y una contraseña segura. Eres el único responsable de mantener la confidencialidad de tus credenciales de acceso. LogPose VZLA no será responsable por pérdidas o daños derivados del uso no autorizado de tu cuenta. Te comprometes a notificar inmediatamente cualquier uso no autorizado de tu cuenta a través de los canales de soporte habilitados.",
  },
  {
    icon: <FiUsers />,
    titulo: "3. Edad Mínima y Capacidad Legal",
    contenido:
      "La Aplicación está dirigida exclusivamente a personas mayores de 18 años con plena capacidad legal. Al registrarte, declaras bajo juramento que eres mayor de edad y que cuentas con la capacidad legal para aceptar los presentes Términos y obligarte a su cumplimiento. Queda estrictamente prohibido el registro de menores de edad o de personas sin capacidad legal, incluso con la autorización de sus representantes legales.",
  },
  {
    icon: <FiShield />,
    titulo: "4. Período de Prueba y Suscripción",
    contenido:
      "Al registrarte, obtienes un período de prueba gratuito de 14 días con acceso completo a todas las funcionalidades. Transcurrido dicho período, tu cuenta continuará operando con el plan gratuito, y podrás adquirir la suscripción Premium para acceder a todas las funcionalidades de forma ilimitada. LogPose VZLA se reserva el derecho de modificar los precios y planes de suscripción, notificando los cambios con al menos 30 días de anticipación.",
  },
  {
    icon: <FiCreditCard />,
    titulo: "5. Suscripción Premium, Pagos y Reembolsos",
    contenido:
      "La suscripción Premium tiene un costo mensual de US$ 3,99 (o su equivalente en bolívares conforme a la tasa de cambio del BCV publicada en la Aplicación). El procesamiento de pagos se encuentra actualmente en proceso de integración con una pasarela de pago autorizada; una vez disponible, los pagos se procesarán exclusivamente a través de dicha pasarela y LogPose VZLA no almacenará ni tendrá acceso a los datos de tu instrumento de pago. Salvo que la legislación aplicable disponga lo contrario, los pagos efectuados no son reembolsables. El impago o incumplimiento del pago podrá resultar en la suspensión de las funcionalidades Premium hasta que regularices tu situación. Los impuestos y comisiones aplicables al pago serán de cargo del usuario.",
  },
  {
    icon: <FiLock />,
    titulo: "6. Privacidad y Protección de Datos",
    contenido:
      "LogPose VZLA recopila y procesa tus datos personales y financieros de acuerdo con lo establecido en nuestra Política de Privacidad. Los datos financieros que ingreses en la Aplicación son almacenados de forma segura en Firebase Firestore con cifrado en reposo y en tránsito. No compartimos tus datos financieros con terceros sin tu consentimiento explícito. Puedes solicitar la eliminación completa de tus datos en cualquier momento contactando a nuestro equipo de soporte.",
  },
  {
    icon: <FiGlobe />,
    titulo: "7. Uso del Asistente IA (Nami)",
    contenido:
      "El asistente financiero Nami utiliza inteligencia artificial a través de la API de Groq (modelo Llama 3.3) para procesar comandos en lenguaje natural. Nami puede registrar transacciones, crear metas de ahorro, gestionar deudas y proporcionar análisis financieros basados en tus datos. Para procesar tus solicitudes, junto con tu mensaje se envía un resumen del contexto financiero de tu cuenta (saldos, movimientos recientes, metas, deudas y gastos fijos), tal como se describe en la Política de Privacidad. Si bien Nami está diseñado para ser preciso, no garantizamos que todas las interpretaciones sean correctas. Es tu responsabilidad revisar y confirmar cualquier operación realizada a través del asistente. Las conversaciones con Nami no se utilizan para entrenar modelos de IA externos.",
  },
  {
    icon: <FiDollarSign />,
    titulo: "8. Uso de Criptomonedas (USDT)",
    contenido:
      "La Aplicación permite registrar saldos y transacciones en criptomonedas estables (USDT) con fines exclusivos de registro y organización financiera. LogPose VZLA NO es una casa de cambio, billetera digital (wallet), exchange ni custodio de criptoactivos. La Aplicación no almacena, transfiere, custodia ni intercambia criptomonedas, y no interviene en operaciones de compra, venta o cambio. Cualquier pérdida derivada de operaciones con criptoactivos es responsabilidad exclusiva del usuario.",
  },
  {
    icon: <FiShieldOff />,
    titulo: "9. Conducta Prohibida",
    contenido:
      "Te comprometes a no utilizar la Aplicación para: (a) realizar actividades ilícitas, fraudulentas o vinculadas con el blanqueo de capitales o la financiación del terrorismo; (b) registrar transacciones ficticias o manipular tus datos con fines de engaño o fraude; (c) intentar acceder a cuentas de terceros o vulnerar la seguridad de la plataforma; (d) introducir malware, virus o cualquier código dañino; (e) realizar ingeniería inversa, copiar o explotar comercialmente la Aplicación sin autorización previa; (f) acosar, amenazar o vulnerar los derechos de terceros. El incumplimiento de esta cláusula facultará a LogPose VZLA a suspender o eliminar tu cuenta de forma inmediata, sin perjuicio de las acciones legales que correspondan.",
  },
  {
    icon: <FiServer />,
    titulo: "10. Disponibilidad, Suspensión y Fuerza Mayor",
    contenido:
      "LogPose VZLA hará sus mejores esfuerzos para mantener la Aplicación disponible, pero no garantiza un acceso ininterrumpido ni libre de errores. La Aplicación podrá suspenderse temporalmente por mantenimientos programados, actualizaciones o fallos de los servicios de terceros de los que depende (Google Cloud/Firebase, Groq, entre otros). No seremos responsables ante el usuario por la suspensión, interrupción o indisponibilidad del servicio, ni por incumplimientos derivados de causas de fuerza mayor o caso fortuito, incluyendo fallos de conectividad, cortes eléctricos, desastres naturales o actos de autoridades.",
  },
  {
    icon: <FiAward />,
    titulo: "11. Propiedad Intelectual",
    contenido:
      "La Aplicación, incluyendo su código fuente, diseño, marcas, logotipos, gráficos, textos y demás contenidos, es propiedad exclusiva de LogPose VZLA o de sus licenciantes y está protegida por las leyes de propiedad intelectual. Al utilizar la Aplicación obtienes una licencia limitada, personal, no exclusiva, no transferible y revocable para su uso. Queda prohibida su reproducción, distribución, modificación, ingeniería inversa o explotación comercial sin autorización previa por escrito.",
  },
  {
    icon: <FiAlertTriangle />,
    titulo: "12. Limitación de Responsabilidad",
    contenido:
      "LogPose VZLA es una herramienta de registro y visualización financiera. No somos una institución financiera, ni ofrecemos asesoría financiera profesional. Los datos presentados en la Aplicación tienen fines informativos y de organización personal. No nos hacemos responsables por decisiones financieras tomadas basándose en la información proporcionada por la Aplicación. La exactitud de los datos ingresados es responsabilidad exclusiva del usuario. LogPose VZLA no garantiza que la Aplicación esté libre de errores, interrupciones o vulnerabilidades de seguridad.",
  },
  {
    icon: <FiXCircle />,
    titulo: "13. Terminación por Incumplimiento",
    contenido:
      "LogPose VZLA podrá suspender o terminar tu cuenta de forma inmediata si incumples cualquiera de los presentes Términos, si utilizas la Aplicación para actividades ilícitas o si tu conducta pone en riesgo la seguridad, integridad o disponibilidad del servicio. En caso de terminación por causa imputable al usuario, no habrá derecho a reembolso de las cantidades pagadas. Podrás solicitar la exportación o eliminación de tus datos conforme a lo establecido en la Política de Privacidad.",
  },
  {
    icon: <FiCheckCircle />,
    titulo: "14. Cancelación y Eliminación de Cuenta",
    contenido:
      "Puedes cancelar tu suscripción y eliminar tu cuenta en cualquier momento desde la sección de Perfil dentro de la Aplicación. Al eliminar tu cuenta, todos tus datos financieros (transacciones, cuentas, deudas, metas, listas, categorías personalizadas y gastos fijos) serán eliminados permanentemente de nuestros servidores en un plazo máximo de 30 días. Las cuentas con suscripción activa no tendrán derecho a reembolso parcial por cancelación anticipada, salvo que la legislación aplicable disponga lo contrario.",
  },
  {
    icon: <FiBookOpen />,
    titulo: "15. Ley Aplicable y Jurisdicción",
    contenido:
      "Estos Términos y Condiciones se rigen e interpretan conforme a las leyes de la República Bolivariana de Venezuela. Cualquier controversia, discrepancia o reclamación derivada de los presentes Términos o del uso de la Aplicación será sometida a la jurisdicción de los tribunales competentes de la República Bolivariana de Venezuela, renunciando las partes a cualquier otro fuero que pudiera corresponderles. En materia de protección de datos personales, será de aplicación la Ley Orgánica de Protección de Datos Personales (2022) y demás normas concordantes.",
  },
  {
    icon: <FiHeadphones />,
    titulo: "16. Soporte y Contacto",
    contenido:
      "Para cualquier consulta, reclamación, sugerencia o solicitud de soporte relacionada con la Aplicación o con los presentes Términos, puedes contactarnos a través del correo electrónico juan9182morales@gmail.com. Atenderemos tu solicitud en un plazo máximo de 5 días hábiles.",
  },
];

export default function TerminosPage() {
  return (
    <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{ fontFamily: "var(--font-ibm)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-amber-500/20 blur-[100px]" />
        <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-violet-600/18 blur-[120px]" />
        <div className="orb3 absolute top-[30%] left-[35%] w-[500px] h-[500px] rounded-full bg-sky-500/12 blur-[90px]" />
        <div className="grid-anim grid-pattern absolute inset-0" />
        <div className="glow-left absolute inset-0" />
        <div className="glow-right absolute inset-0" />
      </div>

      <div className="w-full min-h-screen flex items-center justify-center px-4 py-12 sm:p-10 z-10 relative">
        <motion.div className="w-full max-w-[820px]" initial="oculto" animate="visible" variants={stagger}>
          <motion.div variants={card} className="card-glow">
            <div className="relative bg-[#0B0F1A] rounded-[1.75rem] p-8 sm:p-12 shadow-[0_30px_80px_-10px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.06)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-violet-500/20 to-transparent" />

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
                      Términos y <span className="grad-text">Condiciones</span>
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
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
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
                      href="/reembolsos"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Reembolsos
                    </Link>
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
                      Política de Privacidad
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
