"use client";

import { useEffect, useState } from "react";
import { useUserData } from "@/contexts/UserDataContext";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import Modal from "@/components/ui/Modal";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function MigracionCuentas() {
    const { userData, updateUserData } = useUserData();
    const { crearCuenta } = useBankAccounts();
    const router = useRouter();
    const [mostrarModal, setMostrarModal] = useState(false);
    const [migrando, setMigrando] = useState(false);

    // Revisar si existen saldos del sistema viejo
    const tieneSaldosLegacy = 
        (userData.savingsPhysical && userData.savingsPhysical > 0) ||
        (userData.savingsUSDT && userData.savingsUSDT > 0) ||
        ((userData as any).savingsBs && (userData as any).savingsBs > 0);

    useEffect(() => {
        if (tieneSaldosLegacy) {
            setMostrarModal(true);
        }
    }, [tieneSaldosLegacy]);

    const handleMigrar = async () => {
        setMigrando(true);
        try {
            // 1. Crear cuentas para cada saldo > 0
            if (userData.savingsPhysical && userData.savingsPhysical > 0) {
                await crearCuenta({
                    nombre: "Efectivo Físico",
                    banco: "Efectivo",
                    moneda: "USD",
                    saldoInicial: userData.savingsPhysical,
                    color: "#10b981", // Emerald
                });
            }

            if (userData.savingsUSDT && userData.savingsUSDT > 0) {
                await crearCuenta({
                    nombre: "Billetera Crypto",
                    banco: "Binance",
                    moneda: "USDT",
                    saldoInicial: userData.savingsUSDT,
                    color: "#f59e0b", // Amber
                });
            }

            if ((userData as any).savingsBs && (userData as any).savingsBs > 0) {
                await crearCuenta({
                    nombre: "Cuenta Nacional",
                    banco: "Banco Local",
                    moneda: "BS",
                    saldoInicial: (userData as any).savingsBs,
                    color: "#3b82f6", // Blue
                });
            }

            // 2. Limpiar saldos legacy
            await updateUserData({
                savingsPhysical: 0,
                savingsUSDT: 0,
                ...((userData as any).savingsBs ? { savingsBs: 0 } : {})
            });

            toast.success("¡Tus fondos han sido migrados exitosamente!");
            setMostrarModal(false);
            router.push("/dashboard/cuentas");

        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error en la migración. Por favor contacta soporte.");
        } finally {
            setMigrando(false);
        }
    };

    if (!mostrarModal) return null;

    return (
        <Modal
            isOpen={mostrarModal}
            onClose={() => {}} // No se puede cerrar hasta que migre o decida hacerlo después
            title="¡Nuevo Sistema de Cuentas!"
            // Hide close button in custom modal implementation if needed, here we just pass empty function
        >
            <div className="text-center">
                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-500/30">
                    <FiCheckCircle className="text-violet-400 text-3xl" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Modernizamos tus Ahorros</h3>
                <p className="text-slate-300 text-sm mb-6">
                    Hemos reemplazado el sistema de "Ahorros" por un nuevo <strong>Sistema de Cuentas Bancarias Multi-moneda</strong> más potente y flexible. Tus fondos actuales ({
                        [
                            userData.savingsPhysical ? "Efectivo" : "",
                            userData.savingsUSDT ? "Crypto" : "",
                            (userData as any).savingsBs ? "Bolívares" : ""
                        ].filter(Boolean).join(", ")
                    }) se moverán automáticamente a tus nuevas cuentas.
                </p>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-6 flex flex-col gap-2">
                    {userData.savingsPhysical && userData.savingsPhysical > 0 ? (
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-400">Ahorro Físico</span>
                            <FiArrowRight className="text-slate-500 mx-2" />
                            <span className="text-emerald-400 font-bold">Nueva: Efectivo Físico</span>
                        </div>
                    ) : null}
                    {userData.savingsUSDT && userData.savingsUSDT > 0 ? (
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-400">Ahorro USDT</span>
                            <FiArrowRight className="text-slate-500 mx-2" />
                            <span className="text-amber-400 font-bold">Nueva: Billetera Crypto</span>
                        </div>
                    ) : null}
                    {(userData as any).savingsBs && (userData as any).savingsBs > 0 ? (
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-400">Ahorro Bs</span>
                            <FiArrowRight className="text-slate-500 mx-2" />
                            <span className="text-blue-400 font-bold">Nueva: Cuenta Nacional</span>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleMigrar}
                        disabled={migrando}
                        className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {migrando ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>Migrar mis fondos ahora <FiArrowRight /></>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
