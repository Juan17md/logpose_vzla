import Link from "next/link";
import { FiAlertTriangle, FiArrowLeft, FiBookOpen, FiFileText, FiGlobe, FiMail, FiShield, FiUser } from "react-icons/fi";
import Logo from "@/components/layout/Logo";
import { Outfit, IBM_Plex_Sans } from "next/font/google";
import "../aurora.css";

const outfit = Outfit({ variable: "--font-outfit", weight: ["400","500","600","700","800"], subsets: ["latin"] });
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm", weight: ["300","400","500","600","700"], subsets: ["latin"] });

const secciones = [
  {
    icon: <FiUser />,
    titulo: "1. Identidad y Titularidad",
    contenido:
      "La aplicación LogPose VZLA (en adelante, 'la Aplicación') es un proyecto independiente de gestión financiera personal, propiedad y gestionado por su desarrollador. El titular puede ser contactado a través del correo electrónico juan9182morales@gmail.com. La Aplicación se ofrece como un servicio de software como servicio (SaaS) en línea, sin domicilio social formal de carácter comercial declarado en esta fecha.",
  },
  {
    icon: <FiFileText />,
    titulo: "2. Objeto",
    contenido:
      "El presente Aviso Legal regula el acceso y uso de la Aplicación, así como la relación jurídica entre el titular y los usuarios. El acceso y uso de la Aplicación implica la aceptación plena y sin reservas de este Aviso Legal, de los Términos y Condiciones y de la Política de Privacidad, cuyo contenido se entiende incorporado al presente documento.",
  },
  {
    icon: <FiShield />,
    titulo: "3. Propiedad Intelectual e Industrial",
    contenido:
      "Todos los contenidos de la Aplicación —incluidos textos, imágenes, logotipos, marcas, gráficos, iconos, software, código fuente y el diseño general— son titularidad de LogPose VZLA o de sus legítimos titulares, y están protegidos por las leyes de propiedad intelectual e industrial. Queda expresamente prohibida la reproducción, distribución, comunicación pública, transformación o explotación de dichos contenidos sin autorización previa por escrito del titular. Las marcas de terceros citadas pertenecen a sus respectivos titulares.",
  },
  {
    icon: <FiAlertTriangle />,
    titulo: "4. Contenido y Exención de Responsabilidad",
    contenido:
      "La Aplicación es una herramienta de registro, organización y visualización de finanzas personales. No constituye un servicio financiero, bancario, de asesoría de inversiones, cambiario ni de custodia de activos. El titular no garantiza la exactitud, integridad o actualidad de los datos introducidos por los usuarios, ni se hace responsable de las decisiones financieras que estos adopten con base en la información registrada. El uso de la Aplicación se realiza bajo la exclusiva responsabilidad del usuario.",
  },
  {
    icon: <FiGlobe />,
    titulo: "5. Enlaces Externos",
    contenido:
      "La Aplicación puede contener enlaces a sitios web de terceros (como el proveedor de IA o el sistema de tasas del BCV). El titular no controla dichos sitios ni responde por sus contenidos, políticas o prácticas. La presencia de un enlace no implica relación, recomendación o respaldo alguno. El acceso a sitios de terceros se realiza bajo el riesgo y responsabilidad del usuario, y se sujeta a las propias políticas de cada sitio.",
  },
  {
    icon: <FiShield />,
    titulo: "6. Datos Personales y Privacidad",
    contenido:
      "El tratamiento de tus datos personales se rige íntegramente por la Política de Privacidad de la Aplicación, la cual forma parte del presente Aviso Legal. Para el ejercicio de tus derechos de acceso, rectificación, cancelación u oposición (derechos ARCO), puedes acudir a la sección correspondiente de la Aplicación o contactar a juan9182morales@gmail.com.",
  },
  {
    icon: <FiBookOpen />,
    titulo: "7. Legislación Aplicable y Jurisdicción",
    contenido:
      "La presente Aplicación se rige por la legislación de la República Bolivariana de Venezuela. Para cualquier cuestión litigiosa, las partes se someterán a los juzgados y tribunales competentes de la República Bolivariana de Venezuela, renunciando expresamente a cualquier otro fuero que pudiera corresponderles. En materia de protección de datos personales resultará de aplicación la Ley Orgánica de Protección de Datos Personales (2022).",
  },
  {
    icon: <FiMail />,
    titulo: "8. Contacto",
    contenido:
      "Para cualquier consulta, incidencia, sugerencia o comunicación relacionada con esta Aplicación o con el presente Aviso Legal, puedes escribir a juan9182morales@gmail.com. Atenderemos las comunicaciones en un plazo máximo de 5 días hábiles. Ante cualquier diferencia, serán de aplicación los términos establecidos en los documentos legales de la Aplicación.",
  },
];

export default function AvisoLegalPage() {
  return (
    <div className={`min-h-screen flex w-full ${ibmPlexSans.variable} ${outfit.variable} bg-[#06080F] overflow-hidden relative`} style={{ fontFamily: "var(--font-ibm)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb1 absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-violet-500/18 blur-[100px]" />
        <div className="orb2 absolute -bottom-[25%] -right-[15%] w-[900px] h-[900px] rounded-full bg-violet-600/16 blur-[120px]" />
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
              <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-violet-500/20 to-transparent" />

              <div>
                <div className="flex items-center gap-4 mb-8">
                  <Link
                    href="/login"
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 text-slate-400 hover:text-amber-400 transition-colors duration-200 cursor-pointer"
                  >
                    <FiArrowLeft size={18} />
                  </Link>
                  <div className="flex items-center gap-3">
                    <Logo variant="icon" width={36} height={36} />
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-outfit)" }}>
                      Aviso <span className="grad-text">Legal</span>
                    </h1>
                  </div>
                </div>

                <p className="text-slate-500 text-sm mb-10 border-b border-slate-800/60 pb-6">
                  Última actualización: 2 de agosto de 2026
                </p>

                <div className="space-y-10">
                  {secciones.map((s, i) => (
                    <div key={i} className="group">
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
                    </div>
                  ))}
                </div>

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
                      href="/privacidad"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Privacidad
                    </Link>
                    <Link
                      href="/derechos"
                      className="text-xs text-slate-500 hover:text-amber-400 transition-colors duration-200"
                    >
                      Derechos ARCO
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
