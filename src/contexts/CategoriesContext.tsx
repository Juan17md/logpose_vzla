"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
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
    FiEdit2
} from "react-icons/fi";

// Tipado de Categoría de Usuario
export interface CategoriaUsuario {
    id: string;
    nombre: string;
    tipo: "ingreso" | "gasto" | "ambas";
    icono: string; // Nombre del icono de react-icons/fi
    subcategorias: string[];
    esPredeterminada: boolean;
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
    FiEdit2
};

// Categorías iniciales por defecto que se clonarán al Firestore del usuario la primera vez
const CATEGORIAS_PREDETERMINADAS = [
    { nombre: "Comida", tipo: "gasto" as const, icono: "FiCoffee", subcategorias: ["Supermercado", "Restaurantes", "Delivery", "Cafetería"] },
    { nombre: "Hogar", tipo: "gasto" as const, icono: "FiHome", subcategorias: ["Alquiler", "Servicios", "Limpieza", "Mantenimiento"] },
    { nombre: "Transporte", tipo: "gasto" as const, icono: "FiTruck", subcategorias: ["Gasolina", "Pasaje / Bus", "Taxi / Uber", "Mantenimiento"] },
    { nombre: "Servicios", tipo: "gasto" as const, icono: "FiTool", subcategorias: ["Internet", "Telefonía", "Luz", "Streaming"] },
    { nombre: "Salud", tipo: "gasto" as const, icono: "FiHeart", subcategorias: ["Farmacia", "Consultas Médicas", "Exámenes"] },
    { nombre: "Educación", tipo: "gasto" as const, icono: "FiBookOpen", subcategorias: ["Mensualidad", "Cursos / Talleres", "Libros / Útiles"] },
    { nombre: "Entretenimiento", tipo: "gasto" as const, icono: "FiFilm", subcategorias: ["Cine", "Suscripciones / Juegos", "Eventos / Conciertos", "Salidas"] },
    { nombre: "Salario", tipo: "ingreso" as const, icono: "FiAward", subcategorias: ["Nómina principal", "Bono", "Aguinaldos"] },
    { nombre: "Freelance", tipo: "ingreso" as const, icono: "FiBriefcase", subcategorias: ["Proyectos", "Asesorías", "Trabajos Independientes"] },
    { nombre: "Mascotas", tipo: "gasto" as const, icono: "FiHeart", subcategorias: ["Alimento", "Veterinario", "Accesorios"] },
    { nombre: "Regalos", tipo: "gasto" as const, icono: "FiGift", subcategorias: ["Cumpleaños", "Navidad", "Detalles"] },
    { nombre: "Ropa", tipo: "gasto" as const, icono: "FiShoppingBag", subcategorias: ["Prendas de vestir", "Calzado", "Accesorios"] },
    { nombre: "Seguros", tipo: "gasto" as const, icono: "FiShield", subcategorias: ["Auto", "Vida", "Hogar"] },
    { nombre: "Belleza", tipo: "gasto" as const, icono: "FiScissors", subcategorias: ["Peluquería", "Estética", "Cuidado personal"] },
    { nombre: "Deudas", tipo: "gasto" as const, icono: "FiCreditCard", subcategorias: ["Préstamo personal", "Tarjeta de Crédito", "Intereses"] },
    { nombre: "Inversiones", tipo: "gasto" as const, icono: "FiPieChart", subcategorias: ["Criptomonedas", "Bolsa de Valores", "Ahorros"] },
    { nombre: "Otra", tipo: "gasto" as const, icono: "FiCircle", subcategorias: ["Varios", "Imprevistos"] }
];

interface CategoriesContextType {
    categorias: CategoriaUsuario[];
    cargando: boolean;
    agregarCategoria: (nombre: string, tipo: "ingreso" | "gasto" | "ambas", icono: string, subcategorias: string[]) => Promise<boolean>;
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

    const agregarCategoria = useCallback(async (nombre: string, tipo: "ingreso" | "gasto" | "ambas", icono: string, subcategorias: string[]) => {
        if (!auth.currentUser) return false;
        try {
            const coleccionRef = collection(db, "users", auth.currentUser.uid, "categories");
            await addDoc(coleccionRef, {
                nombre: nombre.trim(),
                tipo,
                icono,
                subcategorias: subcategorias.map(s => s.trim()).filter(s => s !== ""),
                esPredeterminada: false,
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
        try {
            const docRef = doc(db, "users", auth.currentUser.uid, "categories", id);
            const limpioUpdates = Object.fromEntries(
                Object.entries(updates).filter(([, v]) => v !== undefined)
            );
            await updateDoc(docRef, limpioUpdates);
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
