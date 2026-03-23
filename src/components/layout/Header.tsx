import Logo from "./Logo";

export default function Header() {
  return (
    <header className="bg-slate-900 text-white py-8 px-6 text-center shadow-lg border-b border-slate-800">
      <div className="flex flex-col items-center justify-center gap-2">
        <Logo variant="icon" width={60} height={60} />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          LogPose <span className="text-amber-400">Vzla</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-2">
          Navegando el Grand Line de tus finanzas personales
        </p>
      </div>
    </header>
  );
}