"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail, User } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FiUser, FiMail, FiShield, FiCalendar, FiEdit2, FiSave, FiLock, FiLogOut, FiAlertOctagon, FiTrash2 } from "react-icons/fi";

import { isBiometricSupported, registerBiometric } from "@/lib/biometrics";

const FaceIdIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        <path d="M8 7v2m8-2v2" />
        <path d="M9 14s1 1 3 1 3-1 3-1" />
        <path d="M12 11v2" />
    </svg>
);

export default function ProfilePage() {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<{ createdAt?: { toDate: () => Date }, biometricEnabled?: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkBiometric = async () => {
            const supported = await isBiometricSupported();
            setBiometricSupported(supported);
        };
        checkBiometric();
    }, []);

    const handleEnrollBiometric = async () => {
        if (!user) return;
        try {
            const credential = await registerBiometric(user.email!);
            if (credential) {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { 
                    biometricEnabled: true,
                    lastDeviceEnrollment: serverTimestamp()
                });
                localStorage.setItem("last_user_email", user.email!);
                toast.success("¡Face ID Activado!", { description: "Ahora puedes iniciar sesión con biometría en este dispositivo." });
                // Refresh data
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) setUserData(docSnap.data());
            }
        } catch (error) {
            console.error("Error al enrolar:", error);
            toast.error("Error", { description: "No se pudo activar Face ID." });
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push("/login");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setNewName(currentUser.displayName || "");

                // Fetch additional data from Firestore
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateProfile = async () => {
        if (!user) return;

        try {
            await updateProfile(user, { displayName: newName });

            // Update in Firestore as well for consistency
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { displayName: newName });

            setEditing(false);
            toast.success("Perfil actualizado");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo actualizar el perfil");
        }
    };

    const handlePasswordReset = () => {
        if (!user?.email) return;
        setShowResetConfirm(true);
    };

    const confirmPasswordReset = async () => {
        if (!user?.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success("Correo de recuperación enviado");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo enviar el correo");
        } finally {
            setShowResetConfirm(false);
        }
    };

    const handleResetData = async () => {
        if (!user) return;
        setIsDeleting(true);

        try {
            const uid = user.uid;
            const batch = writeBatch(db);

            // 1. Colecciones Raíz filtradas por userId
            const transQ = query(collection(db, "transactions"), where("userId", "==", uid));
            const listsQ = query(collection(db, "shopping_lists"), where("userId", "==", uid));

            const [transSnap, listsSnap] = await Promise.all([
                getDocs(transQ),
                getDocs(listsQ)
            ]);

            // 2. Subcolecciones bajo users/{uid}/
            const subCollections = [
                "debts",
                "fixed_expenses",
                "saving_goals",
                "savings_transactions",
                "account_transactions"
            ];

            const subSnaps = await Promise.all(
                subCollections.map(col => getDocs(collection(db, "users", uid, col)))
            );

            // Añadir eliminaciones al batch
            transSnap.forEach(d => batch.delete(d.ref));
            listsSnap.forEach(d => batch.delete(d.ref));
            subSnaps.forEach(snap => snap.forEach(d => batch.delete(d.ref)));

            // 3. Resetear saldos de cuentas bancarias (Mantener las cuentas)
            const accountsSnap = await getDocs(collection(db, "users", uid, "bank_accounts"));
            accountsSnap.forEach(d => {
                batch.update(d.ref, { 
                    saldo: 0, 
                    actualizadoEn: serverTimestamp() 
                });
            });

            await batch.commit();
            toast.success("Todos los datos han sido reiniciados correctamente");
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error("Error al reiniciar datos:", error);
            toast.error("Error crítico al intentar borrar los datos");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-32 md:pb-10">
            {/* Desktop Header */}
            <div className="hidden md:block bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiUser className="text-9xl text-violet-400" />
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-violet-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Mi Perfil</h1>
                    <p className="text-slate-400 text-lg">Gestiona tu información personal y seguridad.</p>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Mi Perfil</h1>
                    <p className="text-slate-500 text-xs">Información y seguridad</p>
                </div>
                <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                    <FiUser className="text-violet-400 text-xl" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Profile Card */}
                <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-violet-500 to-indigo-400"></div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                            <FiUser className="text-violet-400" />
                            Información Personal
                        </h2>
                        <button
                            onClick={() => {
                                if (editing) handleUpdateProfile();
                                else setEditing(true);
                            }}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg ${editing
                                ? "bg-violet-500 text-white hover:bg-violet-600 shadow-violet-500/20"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                                }`}
                        >
                            {editing ? <><FiSave /> Guardar</> : <><FiEdit2 /> Editar</>}
                        </button>
                    </div>

                    <div className="space-y-5 md:space-y-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Completo</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled={!editing}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className={`w-full bg-slate-800/50 border text-white rounded-xl py-3 px-4 outline-none transition-all text-base ${editing
                                        ? "border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                                        : "border-slate-700/50 text-slate-400 cursor-not-allowed"
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico</label>
                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-slate-400 text-sm md:text-base">
                                    <FiMail className="text-violet-500 shrink-0" />
                                    <span className="truncate">{user?.email}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Miembro Desde</label>
                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-slate-400 text-sm md:text-base">
                                    <FiCalendar className="text-violet-500 shrink-0" />
                                    <span>
                                        {userData?.createdAt?.toDate
                                            ? userData.createdAt.toDate().toLocaleDateString()
                                            : user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan & Security Sidebar */}
                <div className="space-y-6">
                    {/* Security Actions */}
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 to-orange-400"></div>
                        <h3 className="text-lg font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                            <FiShield className="text-red-400" />
                            Seguridad
                        </h3>
                        <button
                            onClick={handlePasswordReset}
                            className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all group border border-slate-700/50 hover:border-red-500/30 mb-3"
                        >
                            <span className="font-medium text-sm">Cambiar Contraseña</span>
                            <FiLock className="opacity-50 group-hover:opacity-100 group-hover:text-red-400 transition-colors" />
                        </button>

                        {biometricSupported && (
                            <button
                                onClick={handleEnrollBiometric}
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group border mb-3 ${userData?.biometricEnabled
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                                    : "bg-violet-500/10 border-violet-500/20 text-violet-200 hover:bg-violet-500/20"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FaceIdIcon className={`w-5 h-5 ${userData?.biometricEnabled ? "text-emerald-400" : "text-violet-400"}`} />
                                    <span className="font-medium text-sm">
                                        {userData?.biometricEnabled ? "Face ID Activado" : "Activar Face ID"}
                                    </span>
                                </div>
                                {userData?.biometricEnabled && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-200 hover:text-red-100 rounded-xl transition-all group border border-red-500/20 hover:border-red-500/40"
                        >
                            <span className="font-medium text-sm">Cerrar Sesión</span>
                            <FiLogOut className="opacity-70 group-hover:opacity-100 transition-colors" />
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-500/5 backdrop-blur-md border border-red-500/20 rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                            <FiAlertOctagon className="text-red-500" />
                            Zona de Peligro
                        </h3>
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                            Esta acción eliminará permanentemente todos tus movimientos, deudas, metas y listas. <span className="text-red-400 font-bold">Las cuentas se mantendrán pero con saldo en 0.</span>
                        </p>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95 font-bold text-sm"
                        >
                            <FiTrash2 />
                            Reiniciar Todos los Datos
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={confirmPasswordReset}
                title="¿Enviar correo de recuperación?"
                message={`Se enviará un enlace temporal a ${user?.email}`}
                confirmText="Enviar Correo"
                type="info"
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleResetData}
                title="¿Estás absolutamente seguro?"
                message="Esta acción no se puede deshacer. Se borrarán todas las transacciones, deudas, metas y gastos fijos. Tus cuentas bancarias se conservarán con saldo cero."
                confirmText="Sí, Reiniciar Todo"
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
