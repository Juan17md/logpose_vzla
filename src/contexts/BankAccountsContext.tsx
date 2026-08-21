"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useMemo,
    useCallback,
} from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    serverTimestamp,
    addDoc,
    updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getRates, type TasasCambio } from "@/lib/currency";
import { cuentaBancariaSchema } from "@/lib/schemas";
import { crearMovimiento, type MovimientoData } from "@/lib/movimientos";
import type {
    CuentaBancaria,
    TransaccionCuenta,
    MonedaSoportada,
    TipoOperacion,
} from "@/lib/bankAccounts";
import { obtenerColorAleatorio } from "@/lib/bankAccounts";

// ─── Tipos del Context ────────────────────────────────────────

interface CrearCuentaInput {
    nombre: string;
    banco: string;
    moneda: MonedaSoportada;
    saldoInicial?: number;
    color?: string;
}

interface OperacionInput {
    cuentaOrigenId: string;
    tipo: TipoOperacion;
    monto: number;
    descripcion?: string;
    // Solo para transferencias
    cuentaDestinoId?: string;
    comision?: number;
    tasaCambio?: number;
}

interface BankAccountsContextType {
    cuentas: CuentaBancaria[];
    transaccionesCuenta: TransaccionCuenta[];
    loading: boolean;
    loadingTransacciones: boolean;
    apiRates: TasasCambio;
    monedaBase: MonedaSoportada;
    tasas: Record<MonedaSoportada, number>;
    tasasEnBs: Record<string, number>;
    crearCuenta: (input: CrearCuentaInput) => Promise<string | null>;
    editarCuenta: (id: string, updates: Partial<Pick<CuentaBancaria, "nombre" | "banco" | "color" | "saldo">>) => Promise<boolean>;
    eliminarCuenta: (id: string) => Promise<boolean>;
    realizarOperacion: (input: OperacionInput) => Promise<boolean>;
    obtenerCuenta: (id: string) => CuentaBancaria | undefined;
    actualizarMonedaBase: (moneda: MonedaSoportada) => void;
    calcularSaldoTotal: (customTasas?: Record<MonedaSoportada, number>) => number;
    toggleExclusionCuenta: (id: string, excluir: boolean) => Promise<boolean>;
    refreshRates: () => Promise<void>;
}

const BankAccountsContext = createContext<BankAccountsContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────

export function BankAccountsProvider({ children }: { children: ReactNode }) {
    const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
    const [transaccionesCuenta, setTransaccionesCuenta] = useState<TransaccionCuenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTransacciones, setLoadingTransacciones] = useState(true);
    const [apiRates, setApiRates] = useState<TasasCambio>({ usd: 0, eur: 0, usdt: 0, lastUpdated: "" });
    const [monedaBase, setMonedaBase] = useState<MonedaSoportada>("BS");

    // Cargar preferencias de sesión
    useEffect(() => {
        const savedMoneda = localStorage.getItem("logpose_moneda_base") as MonedaSoportada;
        if (savedMoneda) setMonedaBase(savedMoneda);
        else localStorage.setItem("logpose_moneda_base", "BS");

        // Las tasas manuales fueron deshabilitadas: limpiamos cualquier valor legado.
        localStorage.removeItem("logpose_tasas_manuales");
        
        // Obtener tasas iniciales
        getRates().then(setApiRates);
    }, []);

    const actualizarMonedaBase = useCallback((moneda: MonedaSoportada) => {
        setMonedaBase(moneda);
        localStorage.setItem("logpose_moneda_base", moneda);
    }, []);

    const refreshRates = useCallback(async () => {
        setLoading(true);
        try {
            const rates = await getRates(true);
            setApiRates(rates);
        } finally {
            setLoading(false);
        }
    }, []);

    const tasasEnBs = useMemo(() => {
        return {
            USD: apiRates.usd,
            EUR: apiRates.eur,
            USDT: apiRates.usdt,
            BS: 1
        };
    }, [apiRates]);

    const tasas = useMemo(() => {
        // Tasas efectivas en Bolívares (BS)
        const { USD: tUSD, EUR: tEUR, USDT: tUSDT } = tasasEnBs;

        if (monedaBase === "BS") {
            return { USD: tUSD, EUR: tEUR, USDT: tUSDT, BS: 1 } as Record<MonedaSoportada, number>;
        }
        
        // Si la base es USD, calculamos todo respecto a USD
        if (monedaBase === "USD") {
            return { 
                USD: 1, 
                EUR: tUSD > 0 ? tEUR / tUSD : 0, 
                USDT: tUSD > 0 ? tUSDT / tUSD : 0, 
                BS: tUSD > 0 ? 1 / tUSD : 0 
            } as Record<MonedaSoportada, number>;
        }

        // Si la base es USDT, calculamos todo respecto a USDT
        if (monedaBase === "USDT") {
            return {
                USD: tUSDT > 0 ? tUSD / tUSDT : 0,
                EUR: tUSDT > 0 ? tEUR / tUSDT : 0,
                USDT: 1,
                BS: tUSDT > 0 ? 1 / tUSDT : 0
            } as Record<MonedaSoportada, number>;
        }

        // Fallback (USD)
        return { USD: 1, EUR: 1.08, USDT: 1, BS: tUSD > 0 ? 1 / tUSD : 0 } as Record<MonedaSoportada, number>;
    }, [tasasEnBs, monedaBase]);

    // Listener de cuentas bancarias
    useEffect(() => {
        let unsubCuentas: (() => void) | null = null;
        let unsubTransacciones: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubCuentas) {
                unsubCuentas();
                unsubCuentas = null;
            }
            if (unsubTransacciones) {
                unsubTransacciones();
                unsubTransacciones = null;
            }

            if (user) {
                // Escuchar cuentas activas
                const qCuentas = query(
                    collection(db, "users", user.uid, "bank_accounts"),
                    where("activa", "==", true),
                    orderBy("creadoEn", "asc")
                );

                unsubCuentas = onSnapshot(qCuentas, (snapshot) => {
                    const data = snapshot.docs.map((docSnap) => {
                        const d = docSnap.data();
                        return {
                            id: docSnap.id,
                            nombre: d.nombre,
                            banco: d.banco,
                            moneda: d.moneda,
                            saldo: d.saldo || 0,
                            color: d.color || "#8b5cf6",
                            activa: d.activa,
                            excluirDelTotal: d.excluirDelTotal || false,
                            creadoEn: d.creadoEn,
                            actualizadoEn: d.actualizadoEn,
                        } as CuentaBancaria;
                    });
                    setCuentas(data);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching bank accounts:", error);
                    setLoading(false);
                });

                // Historial de operaciones bancarias: limitamos a 100 registros
                // para no saturar la memoria en dispositivos de bajos recursos.
                // La UI de cuentas nunca muestra más de ~20 entradas a la vez.
                const qTrans = query(
                    collection(db, "users", user.uid, "account_transactions"),
                    orderBy("fecha", "desc"),
                    limit(100)
                );

                unsubTransacciones = onSnapshot(qTrans, (snapshot) => {
                    const data = snapshot.docs.map((docSnap) => {
                        const d = docSnap.data();
                        return {
                            id: docSnap.id,
                            cuentaOrigenId: d.cuentaOrigenId,
                            cuentaDestinoId: d.cuentaDestinoId,
                            tipo: d.tipo,
                            monto: d.monto,
                            moneda: d.moneda,
                            comision: d.comision,
                            tasaCambio: d.tasaCambio,
                            descripcion: d.descripcion,
                            fecha: d.fecha,
                            creadoEn: d.creadoEn,
                        } as TransaccionCuenta;
                    });
                    setTransaccionesCuenta(data);
                    setLoadingTransacciones(false);
                }, (error) => {
                    console.error("Error fetching account transactions:", error);
                    setLoadingTransacciones(false);
                });
            } else {
                setCuentas([]);
                setTransaccionesCuenta([]);
                setLoading(false);
                setLoadingTransacciones(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubCuentas) unsubCuentas();
            if (unsubTransacciones) unsubTransacciones();
        };
    }, []);

    // ─── CRUD de cuentas ──────────────────────────────────────

    const crearCuenta = useCallback(async (input: CrearCuentaInput): Promise<string | null> => {
        if (!auth.currentUser) return null;

        const parsed = cuentaBancariaSchema.safeParse({
            nombre: input.nombre,
            banco: input.banco,
            moneda: input.moneda,
            saldo: input.saldoInicial || 0,
            color: input.color || obtenerColorAleatorio(),
            activa: true,
        });
        if (!parsed.success) {
            console.error("Cuenta inválida:", parsed.error.flatten());
            return null;
        }

        try {
            const docRef = await addDoc(
                collection(db, "users", auth.currentUser.uid, "bank_accounts"),
                {
                    ...parsed.data,
                    creadoEn: serverTimestamp(),
                    actualizadoEn: serverTimestamp(),
                }
            );
            return docRef.id;
        } catch (error) {
            console.error("Error creating bank account:", error);
            return null;
        }
    }, []);

    const editarCuenta = useCallback(async (
        id: string,
        updates: Partial<Pick<CuentaBancaria, "nombre" | "banco" | "color" | "saldo">>
    ): Promise<boolean> => {
        if (!auth.currentUser) return false;

        try {
            await updateDoc(
                doc(db, "users", auth.currentUser.uid, "bank_accounts", id),
                {
                    ...updates,
                    actualizadoEn: serverTimestamp(),
                }
            );
            return true;
        } catch (error) {
            console.error("Error editing bank account:", error);
            return false;
        }
    }, []);

    const eliminarCuenta = useCallback(async (id: string): Promise<boolean> => {
        if (!auth.currentUser) return false;

        try {
            // Soft delete: marcar como inactiva
            await updateDoc(
                doc(db, "users", auth.currentUser.uid, "bank_accounts", id),
                {
                    activa: false,
                    actualizadoEn: serverTimestamp(),
                }
            );
            return true;
        } catch (error) {
            console.error("Error deleting bank account:", error);
            return false;
        }
    }, []);

    const toggleExclusionCuenta = useCallback(async (id: string, excluir: boolean): Promise<boolean> => {
        if (!auth.currentUser) return false;

        try {
            await updateDoc(
                doc(db, "users", auth.currentUser.uid, "bank_accounts", id),
                {
                    excluirDelTotal: excluir,
                    actualizadoEn: serverTimestamp(),
                }
            );
            return true;
        } catch (error) {
            console.error("Error toggling account exclusion:", error);
            return false;
        }
    }, []);

    // ─── Operaciones (Ledger Unificado con crearMovimiento) ────
    const realizarOperacion = useCallback(async (input: OperacionInput): Promise<boolean> => {
        if (!auth.currentUser) return false;
        const userId = auth.currentUser.uid;

        const cuentaOrigen = cuentas.find(c => c.id === input.cuentaOrigenId);
        if (!cuentaOrigen) throw new Error("Cuenta origen no existe");

        const monedaCuentaOrigen = cuentaOrigen.moneda === "BS" ? "VES" : "USD";

        let tipoMovimiento: MovimientoData["type"];
        let categoria: string;
        let descripcionDefault: string;

        switch (input.tipo) {
            case "deposito":
                tipoMovimiento = "ingreso";
                categoria = "Transferencia";
                descripcionDefault = `Depósito en ${cuentaOrigen.nombre}`;
                break;
            case "retiro":
                tipoMovimiento = "gasto";
                categoria = "Retiro";
                descripcionDefault = `Retiro de ${cuentaOrigen.nombre}`;
                break;
            case "pago":
                tipoMovimiento = "gasto";
                categoria = "Servicios";
                descripcionDefault = `Pago desde ${cuentaOrigen.nombre}`;
                break;
            case "transferencia":
                tipoMovimiento = "transferencia";
                categoria = "Transferencia";
                descripcionDefault = `Transferencia desde ${cuentaOrigen.nombre}`;
                break;
            default:
                tipoMovimiento = "gasto";
                categoria = "Otra";
                descripcionDefault = "Operación bancaria";
        }

        const movimientoData: MovimientoData = {
            amount: input.monto,
            type: tipoMovimiento,
            category: categoria,
            description: input.descripcion || descripcionDefault,
            currency: monedaCuentaOrigen,
            accountId: input.cuentaOrigenId,
            targetAccountId: input.tipo === "transferencia" ? input.cuentaDestinoId : undefined,
            date: new Date(),
        };

        const opciones = {
            validarSaldoOrigen: input.tipo !== "deposito",
            tasaCambioDestino: input.tasaCambio,
            tasasEnBs,
            comisiones: input.comision && input.comision > 0 ? [{
                amount: input.comision,
                currency: monedaCuentaOrigen as "USD" | "VES",
                accountId: input.cuentaOrigenId,
                description: "Comisión de transferencia",
            }] : undefined,
        };

        const resultado = await crearMovimiento(db, userId, movimientoData, opciones);

        if (!resultado.exito) {
            throw new Error(resultado.error);
        }

        return true;
    }, [cuentas, tasasEnBs]);

    // ─── Helpers ──────────────────────────────────────────────

    const obtenerCuenta = useCallback((id: string): CuentaBancaria | undefined => {
        return cuentas.find(c => c.id === id);
    }, [cuentas]);

    const calcularSaldoTotal = useCallback((customTasas?: Record<MonedaSoportada, number>): number => {
        const activeTasas = customTasas || tasas;
        return cuentas.reduce((total, cuenta) => {
            if (cuenta.excluirDelTotal) return total;
            const tasa = activeTasas[cuenta.moneda] || 1;
            return total + (cuenta.saldo * tasa);
        }, 0);
    }, [cuentas, tasas]);

    // ─── Valor del Context ────────────────────────────────────

    const value = useMemo(() => ({
        cuentas,
        transaccionesCuenta,
        loading,
        loadingTransacciones,
        apiRates,
        monedaBase,
        tasas,
        tasasEnBs,
        crearCuenta,
        editarCuenta,
        eliminarCuenta,
        realizarOperacion,
        obtenerCuenta,
        actualizarMonedaBase,
        calcularSaldoTotal,
        toggleExclusionCuenta,
        refreshRates,
    }), [
        cuentas,
        transaccionesCuenta,
        loading,
        loadingTransacciones,
        apiRates,
        monedaBase,
        tasas,
        tasasEnBs,
        crearCuenta,
        editarCuenta,
        eliminarCuenta,
        realizarOperacion,
        obtenerCuenta,
        actualizarMonedaBase,
        calcularSaldoTotal,
        toggleExclusionCuenta,
        refreshRates,
    ]);

    return (
        <BankAccountsContext.Provider value={value}>
            {children}
        </BankAccountsContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────

export function useBankAccounts() {
    const context = useContext(BankAccountsContext);
    if (context === undefined) {
        throw new Error("useBankAccounts debe usarse dentro de un BankAccountsProvider");
    }
    return context;
}
