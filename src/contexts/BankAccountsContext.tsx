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
    onSnapshot,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    addDoc,
    updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getRates, type TasasCambio } from "@/lib/currency";
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
    tasasManuales: Record<string, number | null>;
    monedaBase: MonedaSoportada;
    tasas: Record<MonedaSoportada, number>;
    tasasEnBs: Record<string, number>;
    crearCuenta: (input: CrearCuentaInput) => Promise<string | null>;
    editarCuenta: (id: string, updates: Partial<Pick<CuentaBancaria, "nombre" | "banco" | "color">>) => Promise<boolean>;
    eliminarCuenta: (id: string) => Promise<boolean>;
    realizarOperacion: (input: OperacionInput) => Promise<boolean>;
    obtenerCuenta: (id: string) => CuentaBancaria | undefined;
    actualizarTasaManual: (moneda: string, tasa: number | null) => void;
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
    const [tasasManuales, setTasasManuales] = useState<Record<string, number | null>>({});
    const [monedaBase, setMonedaBase] = useState<MonedaSoportada>("USD");

    // Cargar preferencias de sesión
    useEffect(() => {
        const savedMoneda = localStorage.getItem("logpose_moneda_base") as MonedaSoportada;
        if (savedMoneda) setMonedaBase(savedMoneda);

        const savedTasas = localStorage.getItem("logpose_tasas_manuales");
        if (savedTasas) {
            try {
                setTasasManuales(JSON.parse(savedTasas));
            } catch (e) {
                console.error("Error parsing saved rates", e);
            }
        }
        
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

    const actualizarTasaManual = useCallback((moneda: string, tasa: number | null) => {
        setTasasManuales(prev => {
            const next = { ...prev, [moneda]: tasa };
            localStorage.setItem("logpose_tasas_manuales", JSON.stringify(next));
            return next;
        });
    }, []);

    const tasasEnBs = useMemo(() => {
        return {
            USD: tasasManuales.USD || apiRates.usd,
            EUR: tasasManuales.EUR || apiRates.eur,
            USDT: tasasManuales.USDT || apiRates.usdt,
            BS: 1
        };
    }, [apiRates, tasasManuales]);

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

                // Escuchar transacciones de cuenta (últimas 100)
                const qTrans = query(
                    collection(db, "users", user.uid, "account_transactions"),
                    orderBy("fecha", "desc")
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

        try {
            const docRef = await addDoc(
                collection(db, "users", auth.currentUser.uid, "bank_accounts"),
                {
                    nombre: input.nombre,
                    banco: input.banco,
                    moneda: input.moneda,
                    saldo: input.saldoInicial || 0,
                    color: input.color || obtenerColorAleatorio(),
                    activa: true,
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
        updates: Partial<Pick<CuentaBancaria, "nombre" | "banco" | "color">>
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

    // ─── Operaciones ──────────────────────────────────────────

    const realizarOperacion = useCallback(async (input: OperacionInput): Promise<boolean> => {
        if (!auth.currentUser) return false;
        const userId = auth.currentUser.uid;

        try {
            await runTransaction(db, async (transaction) => {
                const cuentaOrigenRef = doc(db, "users", userId, "bank_accounts", input.cuentaOrigenId);
                const cuentaOrigenDoc = await transaction.get(cuentaOrigenRef);

                if (!cuentaOrigenDoc.exists()) throw new Error("Cuenta origen no existe");

                const saldoOrigen = cuentaOrigenDoc.data().saldo || 0;

                if (input.tipo === "deposito") {
                    // Depósito: sumar al saldo de la cuenta
                    transaction.update(cuentaOrigenRef, {
                        saldo: saldoOrigen + input.monto,
                        actualizadoEn: serverTimestamp(),
                    });
                } else if (input.tipo === "retiro" || input.tipo === "pago") {
                    // Retiro/Pago: restar del saldo
                    if (input.monto > saldoOrigen) {
                        throw new Error("Saldo insuficiente");
                    }
                    transaction.update(cuentaOrigenRef, {
                        saldo: saldoOrigen - input.monto,
                        actualizadoEn: serverTimestamp(),
                    });
                } else if (input.tipo === "transferencia") {
                    // Transferencia: restar de origen + comisión, sumar al destino
                    if (!input.cuentaDestinoId) throw new Error("Cuenta destino requerida");

                    const montoTotalDescontar = input.monto + (input.comision || 0);
                    if (montoTotalDescontar > saldoOrigen) {
                        throw new Error("Saldo insuficiente (incluye comisión)");
                    }

                    const cuentaDestinoRef = doc(db, "users", userId, "bank_accounts", input.cuentaDestinoId);
                    const cuentaDestinoDoc = await transaction.get(cuentaDestinoRef);

                    if (!cuentaDestinoDoc.exists()) throw new Error("Cuenta destino no existe");

                    const saldoDestino = cuentaDestinoDoc.data().saldo || 0;

                    // Descontar del origen (monto + comisión)
                    transaction.update(cuentaOrigenRef, {
                        saldo: saldoOrigen - montoTotalDescontar,
                        actualizadoEn: serverTimestamp(),
                    });

                    // Si hay tasa de cambio, convertir el monto al destino
                    const montoDestino = input.tasaCambio
                        ? input.monto * input.tasaCambio
                        : input.monto;

                    // Sumar al destino
                    transaction.update(cuentaDestinoRef, {
                        saldo: saldoDestino + montoDestino,
                        actualizadoEn: serverTimestamp(),
                    });
                }

                // Registrar la transacción
                const transRef = doc(collection(db, "users", userId, "account_transactions"));
                const monedaOrigen = cuentaOrigenDoc.data().moneda;

                transaction.set(transRef, {
                    cuentaOrigenId: input.cuentaOrigenId,
                    cuentaDestinoId: input.cuentaDestinoId || null,
                    tipo: input.tipo,
                    monto: input.monto,
                    moneda: monedaOrigen,
                    comision: input.comision || null,
                    tasaCambio: input.tasaCambio || null,
                    descripcion: input.descripcion || obtenerDescripcionDefault(input.tipo),
                    fecha: serverTimestamp(),
                    creadoEn: serverTimestamp(),
                });
            });

            return true;
        } catch (error) {
            console.error("Error en operación bancaria:", error);
            throw error; // Re-lanzar para que el componente pueda mostrar el error
        }
    }, []);

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
        tasasManuales,
        monedaBase,
        tasas,
        crearCuenta,
        editarCuenta,
        eliminarCuenta,
        realizarOperacion,
        obtenerCuenta,
        actualizarTasaManual,
        actualizarMonedaBase,
        calcularSaldoTotal,
        toggleExclusionCuenta,
        tasasEnBs,
        refreshRates,
    }), [
        cuentas,
        transaccionesCuenta,
        loading,
        loadingTransacciones,
        apiRates,
        tasasManuales,
        monedaBase,
        tasas,
        crearCuenta,
        editarCuenta,
        eliminarCuenta,
        realizarOperacion,
        obtenerCuenta,
        actualizarTasaManual,
        actualizarMonedaBase,
        calcularSaldoTotal,
        toggleExclusionCuenta,
        tasasEnBs,
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

// ─── Helpers privados ─────────────────────────────────────────

function obtenerDescripcionDefault(tipo: TipoOperacion): string {
    const defaults: Record<TipoOperacion, string> = {
        deposito: "Depósito",
        retiro: "Retiro",
        transferencia: "Transferencia",
        pago: "Pago",
    };
    return defaults[tipo];
}
