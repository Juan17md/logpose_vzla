"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { categoriaSchema } from "@/lib/schemas";
import { IconType } from "react-icons";
import {
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
    FiSmartphone,
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
    FiKey,
    FiCamera,
    FiSun
} from "react-icons/fi";

// Tipado de Categoría de Usuario
export interface CategoriaUsuario {
    id: string;
    nombre: string;
    tipo: "ingreso" | "gasto" | "ambas";
    icono: string; // Nombre del icono de react-icons/fi
    subcategorias: string[];
    esPredeterminada: boolean;
    color?: string; // Color hexadecimal de la categoría
    creadoEn?: any;
}

// Mapa para restaurar los componentes de iconos en la UI
export const MAPA_ICONOS: Record<string, IconType> = {
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
    FiSmartphone,
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
    FiKey,
    FiCamera,
    FiSun
};

// Categorías iniciales por defecto que se clonarán al Firestore del usuario la primera vez
const CATEGORIAS_PREDETERMINADAS = [
    { nombre: "Comida", tipo: "gasto" as const, icono: "FiCoffee", subcategorias: ["Supermercado", "Restaurantes", "Delivery", "Cafetería"], color: "#f43f5e" },
    { nombre: "Hogar", tipo: "gasto" as const, icono: "FiHome", subcategorias: ["Alquiler", "Servicios", "Limpieza", "Mantenimiento"], color: "#f97316" },
    { nombre: "Transporte", tipo: "gasto" as const, icono: "FiTruck", subcategorias: ["Gasolina", "Pasaje / Bus", "Taxi / Uber", "Mantenimiento"], color: "#f59e0b" },
    { nombre: "Servicios", tipo: "gasto" as const, icono: "FiTool", subcategorias: ["Internet", "Telefonía", "Luz", "Streaming"], color: "#3b82f6" },
    { nombre: "Salud", tipo: "gasto" as const, icono: "FiHeart", subcategorias: ["Farmacia", "Consultas Médicas", "Exámenes"], color: "#10b981" },
    { nombre: "Educación", tipo: "gasto" as const, icono: "FiBookOpen", subcategorias: ["Mensualidad", "Cursos / Talleres", "Libros / Útiles"], color: "#8b5cf6" },
    { nombre: "Entretenimiento", tipo: "gasto" as const, icono: "FiFilm", subcategorias: ["Cine", "Suscripciones / Juegos", "Eventos / Conciertos", "Salidas"], color: "#d946ef" },
    { nombre: "Salario", tipo: "ingreso" as const, icono: "FiAward", subcategorias: ["Nómina principal", "Bono", "Aguinaldos"], color: "#10b981" },
    { nombre: "Freelance", tipo: "ingreso" as const, icono: "FiBriefcase", subcategorias: ["Proyectos", "Asesorías", "Trabajos Independientes"], color: "#14b8a6" },
    { nombre: "Mascotas", tipo: "gasto" as const, icono: "FiHeart", subcategorias: ["Alimento", "Veterinario", "Accesorios"], color: "#f97316" },
    { nombre: "Regalos", tipo: "gasto" as const, icono: "FiGift", subcategorias: ["Cumpleaños", "Navidad", "Detalles"], color: "#f43f5e" },
    { nombre: "Ropa", tipo: "gasto" as const, icono: "FiShoppingBag", subcategorias: ["Prendas de vestir", "Calzado", "Accesorios"], color: "#d946ef" },
    { nombre: "Seguros", tipo: "gasto" as const, icono: "FiShield", subcategorias: ["Auto", "Vida", "Hogar"], color: "#3b82f6" },
    { nombre: "Belleza", tipo: "gasto" as const, icono: "FiScissors", subcategorias: ["Peluquería", "Estética", "Cuidado personal"], color: "#d946ef" },
    { nombre: "Deudas", tipo: "gasto" as const, icono: "FiCreditCard", subcategorias: ["Préstamo personal", "Tarjeta de Crédito", "Intereses"], color: "#ef4444" },
    { nombre: "Inversiones", tipo: "gasto" as const, icono: "FiPieChart", subcategorias: ["Criptomonedas", "Bolsa de Valores", "Ahorros"], color: "#14b8a6" },
    { nombre: "Otra", tipo: "gasto" as const, icono: "FiCircle", subcategorias: ["Varios", "Imprevistos"], color: "#64748b" }
];

interface CategoriesContextType {
    categorias: CategoriaUsuario[];
    cargando: boolean;
    agregarCategoria: (nombre: string, tipo: "ingreso" | "gasto" | "ambas", icono: string, subcategorias: string[], color?: string) => Promise<boolean>;
    actualizarCategoria: (id: string, updates: Partial<CategoriaUsuario>) => Promise<boolean>;
    eliminarCategoria: (id: string) => Promise<boolean>;
    agregarSubcategoria: (categoriaId: string, subcategoria: string) => Promise<boolean>;
    eliminarSubcategoria: (categoriaId: string, subcategoria: string) => Promise<boolean>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
    const [categorias, setCategorias] = useState<CategoriaUsuario[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (user) {
                const categoriasRef = collection(db, "users", user.uid, "categories");
                const q = query(categoriasRef, orderBy("nombre", "asc"));

                unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
                    const datos = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as CategoriaUsuario[];

                    if (snapshot.empty && cargando) {
                        // Inicialización con categorías predeterminadas
                        try {
                            const batch = writeBatch(db);
                            CATEGORIAS_PREDETERMINADAS.forEach((cat) => {
                                const nuevoDocRef = doc(collection(db, "users", user.uid, "categories"));
                                batch.set(nuevoDocRef, {
                                    nombre: cat.nombre,
                                    tipo: cat.tipo,
                                    icono: cat.icono,
                                    subcategorias: cat.subcategorias,
                                    esPredeterminada: true,
                                    color: cat.color,
                                    creadoEn: serverTimestamp()
                                });
                            });
                            await batch.commit();
                        } catch (error) {
                            console.error("Error al inicializar categorías predeterminadas:", error);
                        }
                    } else {
                        setCategorias(datos);
                        setCargando(false);
                    }
                }, (error) => {
                    console.error("Error al suscribirse a categorías:", error);
                    setCargando(false);
                });
            } else {
                setCategorias([]);
                setCargando(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, [cargando]);

    const agregarCategoria = useCallback(async (nombre: string, tipo: "ingreso" | "gasto" | "ambas", icono: string, subcategorias: string[], color?: string) => {
        if (!auth.currentUser) return false;
        const parsed = categoriaSchema.safeParse({ nombre, tipo, icono, subcategorias, color, esPredeterminada: false });
        if (!parsed.success) {
            console.error("Categoría inválida:", parsed.error.flatten());
            return false;
        }
        try {
            const coleccionRef = collection(db, "users", auth.currentUser.uid, "categories");
            await addDoc(coleccionRef, {
                ...parsed.data,
                subcategorias: parsed.data.subcategorias.map(s => s.trim()).filter(s => s !== ""),
                color: parsed.data.color || null,
                creadoEn: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error al agregar categoría:", error);
            return false;
        }
    }, []);

    const actualizarCategoria = useCallback(async (id: string, updates: Partial<CategoriaUsuario>) => {
        if (!auth.currentUser) return false;
        const parsed = categoriaSchema.partial().safeParse(updates);
        if (!parsed.success) {
            console.error("Categoría inválida:", parsed.error.flatten());
            return false;
        }
        try {
            const docRef = doc(db, "users", auth.currentUser.uid, "categories", id);
            await updateDoc(docRef, parsed.data);
            return true;
        } catch (error) {
            console.error("Error al actualizar categoría:", error);
            return false;
        }
    }, []);

    const eliminarCategoria = useCallback(async (id: string) => {
        if (!auth.currentUser) return false;
        try {
            const docRef = doc(db, "users", auth.currentUser.uid, "categories", id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error("Error al eliminar categoría:", error);
            return false;
        }
    }, []);

    const agregarSubcategoria = useCallback(async (categoriaId: string, subcategoria: string) => {
        if (!auth.currentUser) return false;
        const categoria = categorias.find(c => c.id === categoriaId);
        if (!categoria) return false;

        const subcategoriaLimpia = subcategoria.trim();
        if (subcategoriaLimpia === "" || categoria.subcategorias.includes(subcategoriaLimpia)) {
            return false;
        }

        try {
            const docRef = doc(db, "users", auth.currentUser.uid, "categories", categoriaId);
            await updateDoc(docRef, {
                subcategorias: [...categoria.subcategorias, subcategoriaLimpia]
            });
            return true;
        } catch (error) {
            console.error("Error al agregar subcategoría:", error);
            return false;
        }
    }, [categorias]);

    const eliminarSubcategoria = useCallback(async (categoriaId: string, subcategoria: string) => {
        if (!auth.currentUser) return false;
        const categoria = categorias.find(c => c.id === categoriaId);
        if (!categoria) return false;

        try {
            const docRef = doc(db, "users", auth.currentUser.uid, "categories", categoriaId);
            await updateDoc(docRef, {
                subcategorias: categoria.subcategorias.filter(s => s !== subcategoria)
            });
            return true;
        } catch (error) {
            console.error("Error al eliminar subcategoría:", error);
            return false;
        }
    }, [categorias]);

    return (
        <CategoriesContext.Provider value={{
            categorias,
            cargando,
            agregarCategoria,
            actualizarCategoria,
            eliminarCategoria,
            agregarSubcategoria,
            eliminarSubcategoria
        }}>
            {children}
        </CategoriesContext.Provider>
    );
}

export function useCategorias() {
    const context = useContext(CategoriesContext);
    if (context === undefined) {
        throw new Error("useCategorias debe ser usado dentro de un CategoriesProvider");
    }
    return context;
}
