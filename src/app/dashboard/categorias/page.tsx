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
    FiCircle,
    FiEdit2,
    FiActivity,
    FiDollarSign,
    FiPercent,
    FiMusic,
    FiTv,
    FiSmile,
    FiShoppingCart,
    FiCompass,
    FiGlobe,
    FiUsers,
    FiSmartphone,
    FiKey,
    FiCamera,
    FiSun
} from "react-icons/fi";
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
    { nombre: "FiCircle", componente: FiCircle },
    { nombre: "FiActivity", componente: FiActivity },
    { nombre: "FiDollarSign", componente: FiDollarSign },
    { nombre: "FiPercent", componente: FiPercent },
    { nombre: "FiMusic", componente: FiMusic },
    { nombre: "FiTv", componente: FiTv },
    { nombre: "FiSmile", componente: FiSmile },
    { nombre: "FiShoppingCart", componente: FiShoppingCart },
    { nombre: "FiCompass", componente: FiCompass },
    { nombre: "FiGlobe", componente: FiGlobe },
    { nombre: "FiUsers", componente: FiUsers },
    { nombre: "FiSmartphone", componente: FiSmartphone },
    { nombre: "FiKey", componente: FiKey },
    { nombre: "FiCamera", componente: FiCamera },
    { nombre: "FiSun", componente: FiSun }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComponenteMonitor(props: any) {
    return <FiMonitor {...props} />;
}

const PALETA_COLORES = [
    { nombre: "Violeta", hex: "#8b5cf6" },
    { nombre: "Azul", hex: "#3b82f6" },
    { nombre: "Esmeralda", hex: "#10b981" },
    { nombre: "Teal", hex: "#14b8a6" },
    { nombre: "Ámbar", hex: "#f59e0b" },
    { nombre: "Naranja", hex: "#f97316" },
    { nombre: "Rosa", hex: "#f43f5e" },
    { nombre: "Rojo", hex: "#ef4444" },
    { nombre: "Fucsia", hex: "#d946ef" },
    { nombre: "Gris Slate", hex: "#64748b" }
];

export default function CategoriasPage() {
    const {
        categorias,
        cargando,
        agregarCategoria,
        actualizarCategoria,
        eliminarCategoria,
        agregarSubcategoria,
        eliminarSubcategoria
    } = useCategorias();

    // Estados del formulario híbrido
    const [nombre, setNombre] = useState("");
    const [tipo, setTipo] = useState<"ingreso" | "gasto" | "ambas">("gasto");
    const [iconoSeleccionado, setIconoSeleccionado] = useState("FiTag");
    const [colorSeleccionado, setColorSeleccionado] = useState("#8b5cf6");
    const [subcategoriasInputs, setSubcategoriasInputs] = useState<Record<string, string>>({});
    
    // Estado de edición
    const [editandoCategoria, setEditandoCategoria] = useState<CategoriaUsuario | null>(null);

    // Estados de navegación móvil y diálogos
    const [vistaMobile, setVistaMobile] = useState<"list" | "form">("list");
    const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaUsuario | null>(null);
    const [subcategoriaAEliminar, setSubcategoriaAEliminar] = useState<{ categoriaId: string; sub: string } | null>(null);

    const handleCrearCategoria = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nombre.trim() === "") {
            toast.error("El nombre de la categoría es obligatorio");
            return;
        }

        if (editandoCategoria) {
            const exito = await actualizarCategoria(editandoCategoria.id, {
                nombre: nombre.trim(),
                tipo,
                icono: iconoSeleccionado,
                color: colorSeleccionado
            });
            if (exito) {
                toast.success("Categoría actualizada correctamente");
                handleLimpiarFormulario();
            } else {
                toast.error("No se pudo actualizar la categoría");
            }
        } else {
            const exito = await agregarCategoria(nombre, tipo, iconoSeleccionado, [], colorSeleccionado);
            if (exito) {
                toast.success("Categoría creada exitosamente");
                handleLimpiarFormulario();
            } else {
                toast.error("No se pudo crear la categoría");
            }
        }
    };

    const handleIniciarEdicion = (cat: CategoriaUsuario) => {
        setEditandoCategoria(cat);
        setNombre(cat.nombre);
        setTipo(cat.tipo);
        setIconoSeleccionado(cat.icono);
        setColorSeleccionado(cat.color || "#8b5cf6");
        setVistaMobile("form");
    };

    const handleLimpiarFormulario = () => {
        setEditandoCategoria(null);
        setNombre("");
        setTipo("gasto");
        setIconoSeleccionado("FiTag");
        setColorSeleccionado("#8b5cf6");
        setVistaMobile("list");
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

    const handleConfirmarEliminarSubcategoria = async () => {
        if (!subcategoriaAEliminar) return;
        const { categoriaId, sub } = subcategoriaAEliminar;
        const exito = await eliminarSubcategoria(categoriaId, sub);
        if (exito) {
            toast.success("Subcategoría eliminada");
        } else {
            toast.error("No se pudo eliminar la subcategoría");
        }
        setSubcategoriaAEliminar(null);
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
            <div className="hidden md:block bg-linear-to-br from-slate-950 to-slate-900/40 border border-slate-900/40 p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden backdrop-blur-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-10 -translate-y-10">
                    <FiTag className="text-9xl text-violet-400 rotate-12" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-violet-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-lg" />
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
                {/* Columna Izquierda: Formulario de Creación / Edición (1/3) */}
                <div className={`lg:col-span-1 space-y-6 ${vistaMobile === "form" ? "block" : "hidden"} lg:block`}>
                    {(vistaMobile === "form" || editandoCategoria !== null) && (
                        <button
                            onClick={handleLimpiarFormulario}
                            className="lg:hidden flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-colors w-fit"
                        >
                            <FiArrowLeft size={18} /> Volver a Categorías
                        </button>
                    )}

                    <div className="sticky top-6 bg-slate-950/40 backdrop-blur-2xl border border-slate-900/40 p-6 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-slate-800/45 transition-colors duration-500">
                        {/* Glow decorativo de fondo dinámico */}
                        <div 
                            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-colors duration-500" 
                            style={{ backgroundColor: `${colorSeleccionado}0c` }}
                        />
                        
                        <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                            {editandoCategoria ? (
                                <>
                                    <FiEdit2 className="text-violet-500 animate-pulse" style={{ color: colorSeleccionado }} /> Editar Categoría
                                </>
                            ) : (
                                <>
                                    <FiPlus className="text-violet-500" /> Nueva Categoría
                                </>
                            )}
                        </h2>

                        <form onSubmit={handleCrearCategoria} className="space-y-5">
                            <Input
                                label="Nombre"
                                placeholder="Ej: Mascotas, Hogar"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="py-4 text-sm font-semibold bg-slate-950/80 border border-slate-900/40 focus:ring-4 focus:ring-violet-500/10 placeholder:text-slate-650"
                                style={{ 
                                    borderColor: editandoCategoria ? `${colorSeleccionado}44` : ""
                                }}
                            />

                            {/* Tipo de Movimiento Selector */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tipo de Movimiento</label>
                                <div className="flex p-1.5 bg-slate-950/80 rounded-2xl border border-slate-900 shadow-inner">
                                    {[
                                        { id: "gasto", label: "Gasto", color: "text-red-400 bg-red-500/10 border border-red-500/20 shadow-lg" },
                                        { id: "ingreso", label: "Ingreso", color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-lg" },
                                        { id: "ambas", label: "Ambas", color: "text-violet-400 bg-violet-500/10 border border-violet-500/20 shadow-lg" }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setTipo(opt.id as "ingreso" | "gasto" | "ambas")}
                                            className={cn(
                                                "flex-1 py-2 text-xs font-bold rounded-xl transition-colors duration-300 text-center border border-transparent cursor-pointer",
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

                            {/* Selección Visual de Color */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Color de Categoría</label>
                                <div className="flex flex-wrap gap-2.5 p-3.5 bg-slate-950/50 rounded-2xl border border-slate-900 shadow-inner justify-between">
                                    {PALETA_COLORES.map((c) => {
                                        const esSeleccionado = colorSeleccionado === c.hex;
                                        return (
                                            <button
                                                key={c.hex}
                                                type="button"
                                                onClick={() => setColorSeleccionado(c.hex)}
                                                className="w-6 h-6 rounded-full cursor-pointer relative flex items-center justify-center transition-colors duration-300 border border-transparent"
                                                style={{ 
                                                    backgroundColor: c.hex,
                                                    boxShadow: esSeleccionado ? `0 0 12px ${c.hex}cc` : "none",
                                                    border: esSeleccionado ? "2px solid #ffffff" : "2px solid transparent"
                                                }}
                                                title={c.nombre}
                                            >
                                                {esSeleccionado && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </button>
                                        );
                                    })}
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
                                            <button
                                                key={ico.nombre}
                                                type="button"
                                                onClick={() => setIconoSeleccionado(ico.nombre)}
                                                className={cn(
                                                    "p-2.5 rounded-xl flex items-center justify-center border transition-colors duration-300 cursor-pointer",
                                                    esSeleccionado
                                                        ? "bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-lg scale-110 z-10"
                                                        : "bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-slate-500 hover:text-slate-300"
                                                )}
                                                style={{
                                                    borderColor: esSeleccionado ? `${colorSeleccionado}88` : "",
                                                    color: esSeleccionado ? colorSeleccionado : "",
                                                    backgroundColor: esSeleccionado ? `${colorSeleccionado}18` : "",
                                                    boxShadow: esSeleccionado ? `0 0 15px ${colorSeleccionado}1e` : ""
                                                }}
                                                title={ico.nombre}
                                            >
                                                <IconComp size={16} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <button
                                    type="submit"
                                    className="w-full py-4 text-white font-black rounded-2xl shadow-lg transition-colors border border-violet-500/10 flex items-center justify-center gap-2 cursor-pointer"
                                    style={{ backgroundColor: colorSeleccionado }}
                                >
                                    {editandoCategoria ? (
                                        <>
                                            <FiEdit2 size={18} />
                                            GUARDAR CAMBIOS
                                        </>
                                    ) : (
                                        <>
                                            <FiPlusCircle size={18} />
                                            CREAR CATEGORÍA
                                        </>
                                    )}
                                </button>

                                {editandoCategoria && (
                                    <button
                                        type="button"
                                        onClick={handleLimpiarFormulario}
                                        className="w-full py-3 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white font-bold rounded-2xl transition-colors border border-slate-800/40 flex items-center justify-center gap-2 cursor-pointer text-sm"
                                    >
                                        <FiX size={16} />
                                        CANCELAR EDICIÓN
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Columna Derecha: Bento Grid de Categorías (2/3) */}
                <div className={`lg:col-span-2 space-y-8 ${vistaMobile === "form" && editandoCategoria === null ? "hidden lg:block" : "block"}`}>
                    <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-[2.5rem] border border-slate-900 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                <FiGrid className="text-violet-500 text-xl" />
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Ecosistema de Categorías</h3>
                        </div>
                        <button
                            onClick={() => {
                                handleLimpiarFormulario();
                                setVistaMobile("form");
                            }}
                            className="md:hidden flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg hover:from-violet-500 hover:to-indigo-500 transition-colors border border-violet-500/10"
                        >
                            <FiPlus className="text-sm" />
                            Nueva
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{categorias.map((cat) => {
                                const IconoCat = MAPA_ICONOS[cat.icono] || FiTag;
                                const esGasto = cat.tipo === "gasto";
                                const esIngreso = cat.tipo === "ingreso";
                                
                                // Color de acento de la categoría con fallback al color tradicional
                                const colorCat = cat.color || (esIngreso ? "#10b981" : esGasto ? "#ef4444" : "#3b82f6");

                                return (
                                    <div
                                        key={cat.id}
                                        className="bg-slate-950/30 border border-slate-900/40 rounded-[2.5rem] p-6 shadow-lg relative overflow-hidden backdrop-blur-xl flex flex-col justify-between group hover:border-slate-800/50 hover:bg-slate-900/50 hover:-translate-y-1 transition-colors duration-500 min-h-[330px]"
                                        style={{
                                            borderColor: editandoCategoria?.id === cat.id ? `${colorCat}66` : ""
                                        }}
                                    >
                                        {/* Halo decorativo de fondo dinámico */}
                                        <div 
                                            className="blur-3xl w-32 h-32 absolute -bottom-10 -right-10 rounded-full pointer-events-none group-hover:scale-120 transition-transform duration-500" 
                                            style={{ backgroundColor: `${colorCat}12` }}
                                        />

                                        <div className="relative z-10">
                                            {/* Cabecera Tarjeta */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3.5">
                                                    <div 
                                                        className="p-3 rounded-2xl border transition-colors duration-350"
                                                        style={{ 
                                                            backgroundColor: `${colorCat}14`, 
                                                            borderColor: `${colorCat}28`, 
                                                            color: colorCat,
                                                            boxShadow: `0 0 15px ${colorCat}0a`
                                                        }}
                                                    >
                                                        <IconoCat size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-extrabold text-white text-base leading-tight tracking-tight">{cat.nombre}</h4>
                                                        <span 
                                                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-1.5 inline-block"
                                                            style={{ 
                                                                backgroundColor: `${colorCat}14`, 
                                                                color: colorCat,
                                                                border: `1px solid ${colorCat}1a`
                                                            }}
                                                        >
                                                            {cat.tipo}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Acciones de la Tarjeta */}
                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        onClick={() => handleIniciarEdicion(cat)}
                                                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-900/60 rounded-xl transition-colors duration-300 cursor-pointer"
                                                        title="Editar Categoría"
                                                    >
                                                        <FiEdit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setCategoriaAEliminar(cat)}
                                                        className="p-2 text-slate-500 hover:text-red-450 hover:bg-red-500/10 rounded-xl transition-colors duration-300 cursor-pointer"
                                                        title="Eliminar Categoría"
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Listado de Subcategorías */}
                                            <div className="mt-6 space-y-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Subcategorías Obligatorias</span>
                                                {cat.subcategorias.length === 0 ? (
                                                    <p className="text-slate-650 text-xs italic py-1">Sin subcategorías agregadas.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
{cat.subcategorias.map(sub => (
                                                                <div 
                                                                    key={sub}
                                                                    className="flex items-center gap-1.5 bg-slate-900/50 hover:bg-slate-800/70 text-slate-300 hover:text-white text-xs py-1.5 pl-3 pr-2.5 rounded-xl border border-slate-900/30 hover:border-slate-800/40 shadow-xs transition-colors duration-300 group/chip"
                                                                >
                                                                    <span>{sub}</span>
                                                                    <button
                                                                        onClick={() => setSubcategoriaAEliminar({ categoriaId: cat.id, sub })}
                                                                        className="p-0.5 rounded-md text-slate-500 hover:text-red-450 hover:bg-red-550/10 transition-colors duration-200 cursor-pointer"
                                                                        title={`Eliminar ${sub}`}
                                                                    >
                                                                        <FiX size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
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
                                                    className="flex-1 bg-slate-950/80 border border-slate-900/40 text-slate-205 text-xs font-semibold rounded-xl py-2.5 px-3 outline-none focus:ring-4 focus:ring-violet-500/10 placeholder:text-slate-600 transition-colors hover:bg-slate-900/20"
                                                    style={{
                                                        borderColor: editandoCategoria?.id === cat.id ? `${colorCat}33` : ""
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleAgregarSubcategoria(cat.id)}
                                                    className="p-2.5 text-white rounded-xl shadow-md transition-colors duration-300 cursor-pointer"
                                                    style={{ 
                                                        backgroundColor: colorCat,
                                                        boxShadow: `0 0 12px ${colorCat}22`
                                                    }}
                                                    title="Agregar"
                                                >
                                                    <FiPlus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

            {/* Diálogo de Confirmación para Eliminar Subcategoría */}
            <ConfirmDialog
                isOpen={subcategoriaAEliminar !== null}
                title="Eliminar Subcategoría"
                message={`¿Seguro que deseas eliminar la subcategoría "${subcategoriaAEliminar?.sub}" de esta categoría?`}
                onConfirm={handleConfirmarEliminarSubcategoria}
                onClose={() => setSubcategoriaAEliminar(null)}
                type="danger"
            />
        </div>
    );
}
