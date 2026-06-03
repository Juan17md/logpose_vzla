"use client";

import { useState } from "react";
import { useCategorias, MAPA_ICONOS, type CategoriaUsuario } from "@/contexts/CategoriesContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import {
    FiPlus,
    FiTag,
    FiTrash2,
    FiX,
    FiPlusCircle,
    FiArrowLeft,
    FiGrid,
    FiTrendingUp,
    FiTrendingDown,
    FiCoffee,
    FiCreditCard,
    FiBookOpen,
    FiFilm,
    FiBriefcase,
    FiHome,
    FiPieChart,
    FiHeart,
    FiGift,
    FiShoppingBag,
    FiAward,
    FiTool,
    FiMonitor,
    FiRepeat,
    FiTruck,
    FiShield,
    FiScissors,
    FiCircle
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/forms/Input";
import Select from "@/components/ui/forms/Select";

const LISTA_ICONOS_SELECCIONABLES = [
    { nombre: "FiCoffee", componente: FiCoffee },
    { nombre: "FiHome", componente: FiHome },
    { nombre: "FiTruck", componente: FiTruck },
    { nombre: "FiTool", componente: FiTool },
    { nombre: "FiHeart", componente: FiHeart },
    { nombre: "FiBookOpen", componente: FiBookOpen },
    { nombre: "FiFilm", componente: FiFilm },
    { nombre: "FiAward", componente: FiAward },
    { nombre: "FiBriefcase", componente: FiBriefcase },
    { nombre: "FiGift", componente: FiGift },
    { nombre: "FiShoppingBag", componente: FiShoppingBag },
    { nombre: "FiShield", componente: FiShield },
    { nombre: "FiScissors", componente: FiScissors },
    { nombre: "FiCreditCard", componente: FiCreditCard },
    { nombre: "FiPieChart", componente: FiPieChart },
    { nombre: "FiMonitor", componente: ComponenteMonitor },
    { nombre: "FiRepeat", componente: FiRepeat },
    { nombre: "FiCircle", componente: FiCircle }
];

function ComponenteMonitor(props: any) {
    return <FiMonitor {...props} />;
}

export default function CategoriasPage() {
    const {
        categorias,
        cargando,
        agregarCategoria,
        eliminarCategoria,
        agregarSubcategoria,
        eliminarSubcategoria
    } = useCategorias();

    // Estados del formulario de nueva categoría
    const [nombre, setNombre] = useState("");
    const [tipo, setTipo] = useState<"ingreso" | "gasto" | "ambas">("gasto");
    const [iconoSeleccionado, setIconoSeleccionado] = useState("FiTag");
    const [subcategoriasInputs, setSubcategoriasInputs] = useState<Record<string, string>>({});

    // Estados de navegación móvil y diálogos
    const [vistaMobile, setVistaMobile] = useState<"list" | "form">("list");
    const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaUsuario | null>(null);

    const handleCrearCategoria = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nombre.trim() === "") {
            toast.error("El nombre de la categoría es obligatorio");
            return;
        }

        const exito = await agregarCategoria(nombre, tipo, iconoSeleccionado, []);
        if (exito) {
            toast.success("Categoría creada exitosamente");
            setNombre("");
            setTipo("gasto");
            setIconoSeleccionado("FiTag");
            setVistaMobile("list");
        } else {
            toast.error("No se pudo crear la categoría");
        }
    };

    const handleEliminarCategoria = async () => {
        if (!categoriaAEliminar) return;
        const exito = await eliminarCategoria(categoriaAEliminar.id);
        if (exito) {
            toast.success("Categoría eliminada correctamente");
        } else {
            toast.error("No se pudo eliminar la categoría");
        }
        setCategoriaAEliminar(null);
    };

    const handleAgregarSubcategoria = async (categoriaId: string) => {
        const inputVal = subcategoriasInputs[categoriaId] || "";
        if (inputVal.trim() === "") {
            toast.error("El nombre de la subcategoría no puede estar vacío");
            return;
        }

        const exito = await agregarSubcategoria(categoriaId, inputVal);
        if (exito) {
            toast.success("Subcategoría agregada");
            setSubcategoriasInputs(prev => ({ ...prev, [categoriaId]: "" }));
        } else {
            toast.error("La subcategoría ya existe o no se pudo agregar");
        }
    };

    const handleEliminarSubcategoria = async (categoriaId: string, sub: string) => {
        const exito = await eliminarSubcategoria(categoriaId, sub);
        if (exito) {
            toast.success("Subcategoría eliminada");
        } else {
            toast.error("No se pudo eliminar la subcategoría");
        }
    };

    if (cargando) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32 md:pb-10">
            {/* Banner superior de escritorio */}
            <div className="hidden md:block bg-linear-to-br from-slate-950 to-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden backdrop-blur-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-10 -translate-y-10">
                    <FiTag className="text-9xl text-violet-400 rotate-12" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-violet-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[3px]">Estructura de Negocio</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-3">
                            Mis <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-indigo-400">Categorías</span>
                        </h1>
                        <p className="text-slate-400 text-base font-medium max-w-md">
                            Organiza tus flujos de ingresos y gastos clasificándolos con subcategorías detalladas.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cabecera Móvil */}
            <header className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Categorías</h1>
                        <p className="text-slate-500 text-xs">Clasificación Financiera</p>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                        <FiTag className="text-violet-400 text-xl" />
                    </div>
                </div>
            </header>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Formulario de Creación (1/3) */}
                <div className={`lg:col-span-1 space-y-6 ${vistaMobile === "form" ? "block" : "hidden"} lg:block`}>
                    <button
                        onClick={() => setVistaMobile("list")}
                        className="lg:hidden flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-colors w-fit"
                    >
                        <FiArrowLeft size={18} /> Volver a Categorías
                    </button>

                    <div className="sticky top-6">
                        <div className="bg-slate-950/40 backdrop-blur-2xl border border-slate-800/80 p-6 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-slate-700/40 transition-all duration-500">
                            {/* Glow decorativo de fondo */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                            
                            <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                                <FiPlus className="text-violet-500" /> Nueva Categoría
                            </h2>

                            <form onSubmit={handleCrearCategoria} className="space-y-5">
                                <Input
                                    label="Nombre"
                                    placeholder="Ej: Mascotas, Hogar"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="py-4 text-sm font-semibold bg-slate-950/80 border-slate-850 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 placeholder:text-slate-650"
                                />

                                {/* Tipo de Movimiento Selector */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tipo de Movimiento</label>
                                    <div className="flex p-1.5 bg-slate-950/80 rounded-2xl border border-slate-900 shadow-inner">
                                        {[
                                            { id: "gasto", label: "Gasto", color: "text-red-400 bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]" },
                                            { id: "ingreso", label: "Ingreso", color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]" },
                                            { id: "ambas", label: "Ambas", color: "text-violet-400 bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]" }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setTipo(opt.id as any)}
                                                className={cn(
                                                    "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 text-center border border-transparent",
                                                    tipo === opt.id
                                                        ? opt.color
                                                        : "text-slate-500 hover:text-slate-350"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selección Visual de Icono */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Seleccionar Icono</label>
                                    <div className="grid grid-cols-6 gap-2.5 p-3.5 bg-slate-950/50 rounded-2xl border border-slate-900 max-h-44 overflow-y-auto custom-scrollbar shadow-inner">
                                        {LISTA_ICONOS_SELECCIONABLES.map((ico) => {
                                            const IconComp = ico.componente;
                                            const esSeleccionado = iconoSeleccionado === ico.nombre;
                                            return (
                                                <motion.button
                                                    key={ico.nombre}
                                                    type="button"
                                                    whileHover={{ scale: 1.15, rotate: 5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setIconoSeleccionado(ico.nombre)}
                                                    className={cn(
                                                        "p-2.5 rounded-xl flex items-center justify-center border transition-all duration-300",
                                                        esSeleccionado
                                                            ? "bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.25)] scale-110 z-10"
                                                            : "bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-slate-500 hover:text-slate-300"
                                                    )}
                                                    title={ico.nombre}
                                                >
                                                    <IconComp size={16} />
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(139, 92, 246, 0.3)" }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    className="w-full py-4 bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 text-white font-black rounded-2xl shadow-lg transition-all border border-violet-400/20 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                                >
                                    <FiPlusCircle size={18} />
                                    CREAR CATEGORÍA
                                </motion.button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Bento Grid de Categorías (2/3) */}
                <div className={`lg:col-span-2 space-y-8 ${vistaMobile === "form" ? "hidden lg:block" : "block"}`}>
                    <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-3xl border border-slate-900 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                <FiGrid className="text-violet-500 text-xl" />
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Ecosistema de Categorías</h3>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setVistaMobile("form")}
                            className="md:hidden flex items-center justify-center gap-2 px-5 py-3 bg-linear-to-r from-violet-600 to-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all border border-violet-400/30"
                        >
                            <FiPlus className="text-sm" />
                            Nueva
                        </motion.button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                            {categorias.map((cat) => {
                                const IconoCat = MAPA_ICONOS[cat.icono] || FiTag;
                                const esGasto = cat.tipo === "gasto";
                                const esIngreso = cat.tipo === "ingreso";
                                return (
                                    <motion.div
                                        key={cat.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="bg-slate-950/30 border border-slate-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between group hover:border-slate-800/80 hover:bg-slate-900/40 hover:-translate-y-1 transition-all duration-500 min-h-[320px]"
                                    >
                                        {/* Halos decorativos de fondo basados en tipo */}
                                        {esGasto && (
                                            <div className="bg-red-500/5 blur-3xl w-28 h-28 absolute -bottom-10 -right-10 rounded-full pointer-events-none group-hover:bg-red-500/8 group-hover:scale-110 transition-all duration-500" />
                                        )}
                                        {esIngreso && (
                                            <div className="bg-emerald-500/5 blur-3xl w-28 h-28 absolute -bottom-10 -right-10 rounded-full pointer-events-none group-hover:bg-emerald-500/8 group-hover:scale-110 transition-all duration-500" />
                                        )}
                                        {!esGasto && !esIngreso && (
                                            <div className="bg-blue-500/5 blur-3xl w-28 h-28 absolute -bottom-10 -right-10 rounded-full pointer-events-none group-hover:bg-blue-500/8 group-hover:scale-110 transition-all duration-500" />
                                        )}

                                        <div className="relative z-10">
                                            {/* Cabecera Tarjeta */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={cn(
                                                        "p-3 rounded-2xl border ring-4 transition-colors duration-350",
                                                        esIngreso 
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 ring-emerald-500/5" 
                                                            : esGasto 
                                                                ? "bg-red-500/10 border-red-500/20 text-red-400 ring-red-500/5"
                                                                : "bg-blue-500/10 border-blue-500/20 text-blue-400 ring-blue-500/5"
                                                    )}>
                                                        <IconoCat size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-extrabold text-white text-base leading-tight tracking-tight">{cat.nombre}</h4>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1.5 inline-block",
                                                            esIngreso 
                                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                                                : esGasto 
                                                                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                        )}>
                                                            {cat.tipo}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Botón de Papelera */}
                                                <button
                                                    onClick={() => setCategoriaAEliminar(cat)}
                                                    className="p-2.5 text-slate-500 hover:text-red-450 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                                                    title="Eliminar Categoría"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Listado de Subcategorías */}
                                            <div className="mt-6 space-y-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Subcategorías Obligatorias</span>
                                                {cat.subcategorias.length === 0 ? (
                                                    <p className="text-slate-650 text-xs italic py-1">Sin subcategorías agregadas.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                                        <AnimatePresence>
                                                            {cat.subcategorias.map(sub => (
                                                                <motion.div 
                                                                    key={sub}
                                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="flex items-center gap-1.5 bg-slate-900/50 hover:bg-slate-800/70 text-slate-300 hover:text-white text-xs py-1.5 pl-3 pr-2.5 rounded-xl border border-slate-850 hover:border-slate-700/60 shadow-xs transition-all duration-300 group/chip"
                                                                >
                                                                    <span>{sub}</span>
                                                                    <button
                                                                        onClick={() => handleEliminarSubcategoria(cat.id, sub)}
                                                                        className="p-0.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                                                        title={`Eliminar ${sub}`}
                                                                    >
                                                                        <FiX size={12} />
                                                                    </button>
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Input Rápido para Nueva Subcategoría */}
                                        <div className="mt-6 pt-4 border-t border-slate-900 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Nueva subcategoría..."
                                                    value={subcategoriasInputs[cat.id] || ""}
                                                    onChange={(e) => setSubcategoriasInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleAgregarSubcategoria(cat.id);
                                                        }
                                                    }}
                                                    className="flex-1 bg-slate-950/80 border border-slate-850 text-slate-205 text-xs font-semibold rounded-xl py-2.5 px-3 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10 placeholder:text-slate-600 transition-all hover:bg-slate-900/20"
                                                />
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleAgregarSubcategoria(cat.id)}
                                                    className="p-2.5 bg-linear-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-300 cursor-pointer"
                                                    title="Agregar"
                                                >
                                                    <FiPlus size={16} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Diálogo de Confirmación para Eliminar Categoría */}
            <ConfirmDialog
                isOpen={categoriaAEliminar !== null}
                title="Desvincular Categoría"
                message={`¿Proceder con la desvinculación completa de "${categoriaAEliminar?.nombre}"? Se perderá toda su lista de subcategorías.`}
                onConfirm={handleEliminarCategoria}
                onClose={() => setCategoriaAEliminar(null)}
                type="danger"
            />
        </div>
    );
}
