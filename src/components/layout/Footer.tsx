import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-500 py-8 px-6 text-center text-sm border-t border-slate-800">
      <div className="flex flex-col items-center gap-3">
        <Logo variant="monochrome" width={180} height={50} className="opacity-60" />
        <p className="text-slate-500">
          Navegando el Grand Line de tus finanzas personales
        </p>
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} LogPose Vzla Project. Todos los derechos reservados.
        </p>
        <p className="text-xs text-slate-600">
          Designed by: Juan17md
        </p>
      </div>
    </footer>
  );
}